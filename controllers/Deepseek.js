const OpenAI = require("openai");

const openai = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: 'sk-08ab67cbeb9449aa825d42d724188a5a'
});

async function Send(anterior, content) {
  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: "system", content: `
        O usuário está digitando uma mensagem em um chat de segurança máxima,
        análise o comportamento e se está semelhante ao seu comportamento anterior.
        Quaisquer divergência, deverá retornar uma opção.
        Se identificar que possa ser um oficial de polícia, também retorne uma opção.
        Só deverá dar ok, se o comportamento for semelhante ao anterior ou se não for oficial.
        se sentir que o mesmo está coagido, ou algo do tipo, bloqueie o ip imediatamente.
        O bloqueio e recusa é mais se você não tiver certeza da sua resposta.

        Contexto da conversa anterior do usuário: 
        ${anterior}
        
        Opções em JSON, por favor:
        {"status": "ok", message: 'motivo'} - Tudo certo.
        {"status": "recuse", message: 'motivo'} - Recusar a mensagem.
        {"status": "block", message: 'motivo'} - Bloquear o acesso.
        {"status": "blockip", message: 'motivo'} - Bloquear o IP.
        `
      },
      {
        role: "user",
        content: content,
      }
    ],
    model: "deepseek-chat",
    response_format: {
      'type': 'json_object'
    }
  });


  return completion.choices[0].message.content;
}

module.exports = { Send };