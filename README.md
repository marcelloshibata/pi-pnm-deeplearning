# DPRT — Deep Learning para Detecção de Pneumonia em Radiografias do Tórax

Projeto Integrador do curso de **Desenvolvimento de Software Multiplataforma**, da FATEC Registro, realizado pelos integrantes: **Marcello Shibata**, **Matheus Cherpinski**, **Grégory Brito** e **Kawan Peniche**.

O **DPRT** é uma aplicação web para apoiar médicos na triagem de pneumonia a partir de radiografias de tórax. O médico cadastra pacientes, envia a radiografia, solicita a análise do exame e, ao final, registra o relatório com o parecer e o diagnóstico, que pode ser exportado em PDF.

O projeto tem como objetivo auxiliar radiologistas e profissionais da saúde a identificar a doença
da pneumonia por meio da análise da radiografia de tórax utilizando a tecnologia do Deep
Learning. O sistema utiliza um banco de dados com diversos exames de imagem de tórax de
pacientes diagnosticados com a doença, fazendo assim com que Inteligência Artificial crie um
padrão de elementos que quando observados e interpretados apontem uma possível presença da
infecção no pulmão do paciente. Dessa forma o processo de identificação da doença se torna
mais ágil facilitando o diagnóstico sobre casos de pneumonia melhorando o fluxo de pacientes
em clínicas e hospitais.

> **Estado atual da análise:** o modelo de deep learning ainda **não está integrado** à aplicação. Ao clicar em "Analisar exame", a probabilidade de pneumonia é **simulada** (valor aleatório gerado com a função `Math.random()`). O fluxo completo (upload → análise → relatório) já está funcional e pronto para receber o modelo real, que será desenvolvido nos próximos semestres.

## Estrutura do repositório

| Pasta | Conteúdo |
| --- | --- |
| [`dprt-projeto/`](./dprt-projeto) | **O projeto em si** (aplicação web) — detalhado abaixo |
| [`Artefatos/`](./Artefatos) | Artefatos e diagramas do projeto (casos de uso, classes, objetos, banco de dados, redes e documento em PDF que detalha os artefatos) |
| [`site_equipe/`](./site_equipe) | Site de apresentação da nossa equipe que foi responsável por desenvolver o projeto |

---

## Projeto

### Funcionalidades

- **Autenticação de médicos**: O padrão: cadastro (nome, e-mail, CRM, especialidade e hospital), login e logout, com senhas protegidas por hash e sessões de 2 horas.
- **Perfil do médico**: página de perfil que pode ser incluída uma foto do médico.
- **Gestão de pacientes**: cadastrar, buscar, visualizar, editar e excluir pacientes.
- **Gestão de exames**: cadastrar exame com upload da radiografia, visualizar a imagem, listar os exames mais recentes e excluir exames.
- **Análise do exame**: gera a probabilidade de pneumonia e exibe um alerta com o nível de risco (atualmente simulada).
- **Relatório médico**: registro do parecer final e do diagnóstico confirmado, que conclui o exame, com **exportação em PDF** (Utilizando `pdfkit`).
- **Isolamento de dados**: cada médico acessa apenas os seus próprios pacientes e exames; rotas protegidas por middleware de autenticação.

### Tecnologias

![NodeJS](https://img.shields.io/badge/node.js-%236DA55F.svg?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)
![MongoDB](https://img.shields.io/badge/MongoDB-%234ea94b.svg?style=for-the-badge&logo=mongodb&logoColor=white)
![EJS](https://img.shields.io/badge/ejs-%23B4CA65.svg?style=for-the-badge&logo=ejs&logoColor=black)
![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/css-%23663399.svg?style=for-the-badge&logo=css&logoColor=white)
![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)
![Vercel](https://img.shields.io/badge/vercel-%23000000.svg?style=for-the-badge&logo=vercel&logoColor=white)

- **Back-end:** Node.js, Express
- **Banco de dados:** MongoDB com Mongoose para ODM; imagens (radiografias e fotos de perfil) armazenadas no **GridFS** (que divide a imagem em chunks e guarda um documento referenciando os metadados dela)
- **Views:** EJS com *partials* reutilizáveis, HTML e CSS puros
- **Deploy:** preparado para a Vercel (serverless), com conexão ao banco reaproveitada entre requisições

### Arquitetura

O projeto segue o padrão **MVC**:

```
dprt-projeto/
├── index.js          # Configuração do Express, sessão e rotas
├── config/           # Conexão com o MongoDB e utilitário do GridFS
├── model/            # Schemas: Medico, Paciente, Exame
├── controller/       # Regras de negócio: Medico, Paciente, Exame
├── routes/           # Rotas de cada recurso
├── middleware/       # Auth (sessão), Upload (radiografia), UploadFoto (perfil)
├── views/            # Páginas EJS (login, cadastro, pacientes, exames, perfil) e partials/modais
└── public/           # CSS, ícones/imagens e scripts do front-end
```

### Principais rotas

| Método | Rota | Descrição |
| --- | --- | --- |
| GET/POST | `/login`, `/cadastro`, `/authenticate`, `/logout` | Autenticação do médico |
| GET/POST | `/perfil`, `/perfil/foto` | Perfil e foto do médico |
| GET | `/pacientes`, `/pacientes/buscar` | Listagem e busca de pacientes |
| POST | `/pacientes/cadastrar`, `/pacientes/editar` | Criar e editar paciente |
| GET | `/pacientes/deletar/:id` | Excluir paciente |
| GET | `/exames` | Listagem de exames |
| POST | `/exames/cadastrar` | Cadastrar exame com radiografia |
| GET | `/exames/:id/imagem` | Visualizar a radiografia |
| POST | `/exames/analisar` | Analisar exame |
| POST | `/exames/relatorio` | Registrar relatório e concluir o exame |
| GET | `/exames/:id/relatorio.pdf` | Exportar relatório em PDF |
| GET | `/exames/deletar/:id` | Excluir exame |

### Como testar o projeto?

Você pode acessar o projeto que já está em funcionamento pelo link: **https://dprt-pnm.vercel.app/**

### Como executar localmente

Caso queira executar localmente o projeto, é importante ter os pré-requisitos: **Node.js** e uma instância do **MongoDB** (local ou Atlas).

```bash
cd dprt-projeto
npm install
```

Crie um arquivo `.env` na pasta `dprt-projeto`:

```env
MONGO_URI=mongodb://localhost:27017/dprt
SESSION_SECRET=uma-chave-secreta
PORT=8080
```

Inicie a aplicação:

```bash
npm run dev    # desenvolvimento (nodemon)
```

