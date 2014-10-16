var argv = require('yargs').argv;
var fs = require('fs');
var path = require('path');
var npm = require('npm'); // Utiliza o do package global
var _ = require('lodash');
require('colors');

var pmTwoVersion = 'pm2@0.11.1'; // latest version 16/10/2014

var args = require('yargs')
  .usage('Inicia diretório com estrutura base como "container" para um determinado projeto e instala o mesmo pelo npm'.underline.green + '\nUsage: $0 nome-pacote-npm')

  .example('$0 projeto-teste', '-> projeto-teste_v1')
  .example('$0 projeto-teste@v2.3.1', '-> projeto-teste_v2')
  .example('$0 projeto-teste@v2.3.1 -a _port_8080', '-> projeto-teste_v2_port_8080')
  .example('$0 projeto-teste@v1.1.2 -n "meu_teste_beta"', '-> meu_teste_beta')
  .example('$0 projeto-teste@v1.2.3 -m', '-> projeto-teste_v1.2')

  .demand(1, 'O nome do projeto que será instalado deve ser informado. Veja exemplos acima.'.red)

  .alias('append', ['a'])
  .describe('append', 'Adiciona o texto específico no final do nome do diretório')

  .alias('name', ['n'])
  .describe('name', 'Altera o nome do diretório')

  .alias('append-latest-minor', ['m'])
  .describe('append-latest-minor', 'Adiciona a minor version no final do nome do diretório')

  .help('h', 'Ajuda')
  .argv;

// Wrapper para um possível log...
function log(msg) {
  console.log(msg);
}

log('Iniciando a criação do diretório "container" para o projeto'.green);

var packageFullName = args['_'][0];

npm.load({}, function (err) {
  // npm.config.set('loglevel', 'warn');

  // Busca o pacote a ser instalado
  npm.commands.view([packageFullName], true, function (err, data) {
    if (err) {
      log('Erro ao obter informações do pacote a ser instalado.'.red + '\n' + err.message);
      process.exit(1);
    }

    // Pega versão disponível mais atual
    var version = _.keys(data)[0];
    var name = data[version].name;

    // Pegando versões do código
    var v = /(\d)+\.(\d)\.(.+)/.exec(version);
    var majorVersion = v[1];
    var minorVersion = v[2];
    var patchVersion = v[3];

    var rootPath = './';
    if (args.name)
      rootPath += args.name;
    else if (args.append)
      rootPath += name + '_v' + majorVersion + args.append;
    else if (args.appendLatestMinor)
      rootPath += name + '_v' + majorVersion + '.' + minorVersion;
    else
      rootPath = name + '_v' + majorVersion;

    log('Verifica se o diretório do projeto existe... ' + rootPath.cyan);
    if (fs.existsSync(rootPath)) {
      log('Diretório do projeto já existe... impossível continuar'.red);
      process.exit(1);
    }
    log('Cria o diretório base para o projeto');
    fs.mkdirSync(rootPath);
    log('Cria diretórios dentro da base do projeto');
    fs.mkdirSync(path.resolve(rootPath, 'configs'));
    fs.mkdirSync(path.resolve(rootPath, 'logs'));
    fs.mkdirSync(path.resolve(rootPath, 'node_modules'));

    npm.commands.install(rootPath, [packageFullName, pmTwoVersion], function (err, data) {
      if (err) {
        log('Erro ao instalar o app como dependência.'.red + '\n' + err.message);
        process.exit(1);
      }







      log( ('Pacote inicializado com sucesso no diretório: ' + rootPath).green );

    });
  });
});
