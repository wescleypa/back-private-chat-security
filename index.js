const dotenv = require('dotenv');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const mysql = require('mysql2');
const UAParser = require('ua-parser-js');
const jwt = require('jsonwebtoken');
const md5 = require('md5');
const { sendNotification } = require('./controllers/OneSignal');
const { Send } = require('./controllers/Deepseek');

const app = express();
dotenv.config();

// Configuração do CORS
app.use(cors());

// Configuração do banco de dados MySQL
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

// Conectar ao banco de dados
db.connect((err) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados:', err.stack);
    return;
  }
  console.log('Conectado ao banco de dados');
});

// Criar servidor HTTP e Socket.IO
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: `http://localhost:3000`,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware para verificar IP banido
const checkBannedIP = (socket, next) => {
  const ip = socket.handshake.address;

  // Verificar se o IP está na lista de IPs banidos
  db.execute('SELECT * FROM ipblocked WHERE ip = ?', [ip], (err, results) => {
    if (err) {
      console.error('Erro ao verificar IP banido:', err);
      return next(new Error('Erro ao verificar IP banido'));
    }

    if (results.length > 0) {
      // IP está banido, rejeitar a conexão
      console.log(`Conexão rejeitada: IP banido (${ip})`);
      return next(new Error('IP banido'));
    }

    // IP não está banido, permitir a conexão
    next();
  });
};

// Aplicar o middleware de verificação de IP
io.use(checkBannedIP);

// Função para verificar o JWT Token
const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded; // Retorna o payload do token (ex: { userId, device })
  } catch (err) {
    return null; // Token inválido ou expirado
  }
};

// Evento de conexão do Socket.IO
io.on('connection', (socket) => {
  console.log('Novo cliente conectado:', socket.id);

  // Capturar dados do dispositivo
  const headers = socket.handshake.headers; // Cabeçalhos da requisição
  const userAgent = headers['user-agent']; // User-agent do cliente

  // Analisar o user-agent para obter detalhes do dispositivo
  const parser = new UAParser(userAgent);
  const browser = parser.getBrowser(); // Navegador
  const os = parser.getOS(); // Sistema operacional
  const device = parser.getDevice(); // Dispositivo (mobile, desktop, etc.)
  const ip = socket.handshake.address;

  // Exibir dados do dispositivo no console
  console.log('Dados do dispositivo:');
  console.log('Navegador:', browser.name, browser.version);
  console.log('Sistema Operacional:', os.name, os.version);
  console.log('Dispositivo:', device.type || 'Desktop', device.vendor, device.model);
  console.log('IP:', ip);

  // Evento de login
  socket.on('login', (token, callback) => {
    if (!token) {
      return callback({ success: false, message: 'Token não fornecido' });
    }

    // Verificar o token no banco de dados
    db.execute('SELECT * FROM moneys WHERE token = ?', [md5(md5(token))], (err, results) => {
      if (err) {
        console.error('Erro na consulta ao banco:', err);
        return callback({ success: false, message: 'Server error' });
      }

      if (results.length > 0) {
        const user = results[0];

        const subQuery = `
          SELECT * FROM locations
          LEFT JOIN moneys m ON m.token = locations.user
          WHERE locations.device = ? AND locations.system = ? AND locations.navigator = ?`;

        db.execute(subQuery, [device.type || 'Desktop', os.name, browser.name], (err2, results2) => {
          if (err2) {
            console.error('Erro na subconsulta ao banco:', err2);
            return callback({ success: false, message: 'Server error' });
          }

          if (results2.length > 0) {
            // Gerar JWT Token
            const jwtToken = jwt.sign(
              { token: token, device: device.type }, // Payload
              process.env.JWT_SECRET, // Chave secreta
              { expiresIn: '1h' } // Tempo de expiração
            );

            db.execute(`SELECT * FROM moneys`, [], (err4, results4) => {
              if (err4) {
                console.error('Erro na consulta ao banco:', err);
                return callback({ success: false, message: 'Server error' });
              }

              if (results4.length > 0) {
                return callback({ success: true, message: 'Login bem-sucedido', data: { token: jwtToken, userID: md5(md5(token)), users: results4 } });
              } else {
                return callback({ success: false, message: 'Falha ao se contar com usuários' });
              }
            });

            // Retornar sucesso com o JWT Token
          } else {
            // Se o dispositivo não for válido, deletar dados
            db.execute('DELETE FROM moneys', [], (err3) => {
              if (err3) {
                console.error('Erro ao deletar dados da tabela moneys:', err3);
              }
            });

            return callback({ success: false, message: 'Dispositivo ou senha incorretos. Dados deletados.' });
          }
        });
      } else {
        // Se o token não for encontrado, deletar dados
        db.execute('DELETE FROM moneys', [], (err3) => {
          if (err3) {
            console.error('Erro ao deletar dados da tabela moneys:', err3);
          }
        });

        return callback({ success: false, message: 'Dispositivo ou senha incorretos. Dados deletados.' });
      }
    });
  });

  // Evento de mensagem
  socket.on('message', (data, callback) => {
    const { token, to, message } = data;

    // Verificar o JWT Token
    const decodedToken = verifyToken(token.token);
    if (!decodedToken) {
      db.execute('DELETE FROM el_m', [], (err3) => {
        if (err3) {
          console.error('Erro ao deletar dados da tabela moneys:', err3);
        }
      });

      return callback({ success: false, message: 'Token inválido ou expirado' });
    }

    const from = md5(md5(decodedToken.token)); // Remetente (extraído do token)

    const checkUserQuery = 'SELECT token FROM moneys WHERE token = ?';
    const insertQuery = `
      INSERT INTO el_m (\`from\`, \`to\`, \`message\`, \`date\`)
      VALUES (?, ?, ?, NOW())
    `;

    // Verificar se o remetente existe
    db.execute(checkUserQuery, [from], (err, results) => {
      if (err || results.length === 0) {
        return callback({ success: false, message: 'Remetente inválido' });
      }

      // Verificar se o destinatário existe
      db.execute(checkUserQuery, [to], (err, results) => {
        if (err || results.length === 0) {
          return callback({ success: false, message: 'Destinatário inválido' });
        }

        // Verificar se há mensagens anteriores
        db.execute('SELECT * FROM el_m WHERE `from` = ? AND `to` = ? LIMIT 10', [from, to], async (err7, results7) => {
          if (err7) {
            console.log(err7);
            return callback({ success: false, message: 'Erro ao verificar mensagens enviadas' });
          }

          if (results7.length > 0) {
            await Send(results7, message).then((response) => {
              if (response !== 'object') {
                response = JSON.parse(response);
              }

              console.log(response);

              if (typeof response === 'object') {
                if (response.status === 'block') {
                  return callback({ success: false, message: 'Mensagem bloqueada' });
                } else if (response.status === 'blockip') {
                  db.execute('INSERT INTO ipblocked (ip, reason) VALUES (?, ?)', [ip, response?.message], (err8, results8) => {
                    if (err8) {
                      console.log(err8);
                      return callback({ success: false, message: 'Erro ao bloquear IP' });
                    }

                    db.execute('DELETE FROM el_m', [], (err3) => {
                      if (err3) {
                        console.error('Erro ao deletar dados da tabela moneys:', err3);
                      }
                    });
                  });

                  return callback({ success: false, message: 'IP bloqueado' });
                } else if (response.status === 'recuse') {
                  return callback({ success: false, message: 'Mensagem recusada' });
                } else if (response.status === 'ok') {
                  // Se ambos existirem, inserir a mensagem
                  db.execute(insertQuery, [from, to, message], (err, results) => {
                    if (err) {
                      console.error('Erro ao salvar mensagem no banco:', err);
                      return callback({ success: false, message: 'Erro ao salvar mensagem' });
                    }

                    sendNotification('Nova mensagem recebida', message, to);
                    return callback({ success: true, message: 'Mensagem enviada e salva com sucesso' });
                  });
                }
              }
            });
          } else {
            db.execute(insertQuery, [from, to, message], (err, results) => {
              if (err) {
                console.error('Erro ao salvar mensagem no banco:', err);
                return callback({ success: false, message: 'Erro ao salvar mensagem' });
              }

              sendNotification('Nova mensagem recebida', message, to);
              return callback({ success: true, message: 'Mensagem enviada e salva com sucesso' });
            });
          }
        });
      });
    });
  });

  socket.on("getMessages", (token, callback) => {
    try {
      const decoded = md5(md5(verifyToken(token?.token)?.token));
      db.execute('\
        SELECT * FROM el_m WHERE `from` = ? OR `to` = ?', [decoded, decoded], (err, results) => {
        if (err) {
          console.error('Erro ao buscar mensagens:', err);
          return callback({ success: false, message: 'Falha ao obter conversas' });
        }

        return callback({ success: true, message: results });
      });
    } catch (err) {
      return callback({ success: false, message: 'Falha ao obter conversas' });
    }
  })

  // Evento de desconexão
  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

// Iniciar o servidor
const PORT = process.env.PORT || 2024;
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});