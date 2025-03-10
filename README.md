# Projeto de Backend com Node.js, MySQL2 e JWT

Este projeto é uma API RESTful desenvolvida com Node.js e Express, utilizando MySQL como banco de dados e JSON Web Token (JWT) para autenticação. A API permite operações CRUD (Create, Read, Update, Delete) em uma tabela de usuários, com rotas protegidas por autenticação JWT.

## Índice

- [Tecnologias Utilizadas](#tecnologias-utilizadas)
- [Instalação](#instalação)
- [Configuração do Banco de Dados](#configuração-do-banco-de-dados)
- [Uso](#uso)
- [Autenticação](#autenticação)
- [Rotas da API](#rotas-da-api)
- [Contribuição](#contribuição)
- [Licença](#licença)
- [Contato](#contato)

## Tecnologias Utilizadas

- [Node.js](https://nodejs.org/)
- [Express](https://expressjs.com/)
- [MySQL2](https://www.npmjs.com/package/mysql2)
- [jsonwebtoken](https://www.npmjs.com/package/jsonwebtoken)
- [dotenv](https://www.npmjs.com/package/dotenv)

## Instalação

1. Clone este repositório:

   ```bash
   git clone https://github.com/seu-usuario/nome-do-repositorio.git

Acesse o diretório do projeto:

bash
Copiar
Editar
cd nome-do-repositorio
Instale as dependências:

bash
Copiar
Editar
npm install
Configure as variáveis de ambiente:

Renomeie o arquivo .env.example para .env e preencha as informações necessárias, como as credenciais do banco de dados e a chave secreta para o JWT.
Inicie o servidor:

bash
Copiar
Editar
npm start
Configuração do Banco de Dados
Certifique-se de que o MySQL está instalado e em execução em sua máquina.

Crie um banco de dados para o projeto:

sql
Copiar
Editar
CREATE DATABASE nome_do_banco_de_dados;
Implemente as migrações ou scripts SQL fornecidos no diretório database para criar as tabelas necessárias.

Uso
Após iniciar o servidor, a API estará disponível em http://localhost:3000. Você pode utilizar ferramentas como Postman ou Insomnia para testar as rotas da API.
