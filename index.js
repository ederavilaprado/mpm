var argv = require('yargs').argv;
var fs = require('fs');
var path = require('path');
var npm = require('npm'); // Utiliza o do package global
var _ = require('lodash');
require('colors');

var packages = [
  'colors@1.0.3',
  'lodash@2.4.1',
  'yargs@1.3.2'
];


var yargs = require('yargs')
  .usage('Inicia diretório com estrutura base como "container" para um determinado projeto e instala o mesmo pelo npm'.underline.green + '\nUsage: $0 <nome-pacote-npm>')

  .example('$0 projeto-teste', '-> projeto-teste_v1')
  .example('$0 projeto-teste@v2.3.1', '-> projeto-teste_v2')
  .example('$0 projeto-teste@v2.3.1 -a _port_8080', '-> projeto-teste_v2_port_8080')
  .example('$0 projeto-teste@v1.1.2 -n "meu_teste_beta"', '-> meu_teste_beta')
  .example('$0 projeto-teste@v1.2.3 -m', '-> projeto-teste_v1.2')

  .alias('append', ['a'])
  .describe('append', 'Adiciona o texto específico no final do nome do diretório')

  .alias('name', ['n'])
  .describe('name', 'Altera o nome do diretório')

  .alias('append-latest-minor', ['m'])
  .describe('append-latest-minor', 'Adiciona a minor version no final do nome do diretório')

  .version('v' + JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'))).version + '\n', 'v', 'Versão')
  .help('h', 'Ajuda');

var args = yargs.argv;

// Wrapper para um possível log...
function log(msg) {
  console.log(msg);
}

// Valida se foi informado apenas 1 nome antes de continuar...
if (args['_'].length !== 1) {
  yargs.showHelp();
  log('\nO nome do projeto que será instalado deve ser informado. Apenas 1 projeto. Veja exemplos acima.\n'.red);
  process.exit(1);
}

log('Iniciando a criação do diretório "container" para o projeto'.green);

var packageFullName = args['_'][0];

npm.load({}, function (err) {
  // npm.config.set('loglevel', 'warn');

  if (err) {
    log('Foi encontrado um erro ao carregar o npm.'.red);
    process.exit(1);
  }

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

    // Adiciona o pacote desejado a lista de pacotes default
    packages.push(packageFullName);

    log('Inicia instalação de pacotes do projeto');
    npm.commands.install(rootPath, packages, function (err, data) {
      if (err) {
        log('Erro ao instalar o app como dependência.'.red + '\n' + err.message);
        process.exit(1);
      }

      // Copia script base para inicialização para dentro do pacote
      fs.createReadStream( path.resolve(__dirname, 'bin', 'app')).pipe(fs.createWriteStream(path.resolve(rootPath, 'app'), {flags:'w', mode: 0755}));
      // Cria arquivo com informações para futuro start
      fs.writeFileSync(path.resolve(rootPath, '.info.json'),
        JSON.stringify({
          appName: name
        }, null, 2)
      );


      // FIXME: Verificar se existe uma forma de fazer isto com o npm prog.
      // npm.commands.link(rootPath, ['pm2'], function (err, data) {
      // CAUTION: alterar o prefix alterar para toda a estrutura do npm
      var exec = require('child_process').exec,
          child;

      child = exec('cd ' + rootPath + ' && npm link pm2', function (error, stdout, stderr) {
        if (error !== null) {
          log('Erro ao realizar o link para o pm2 dentro de node_modules'.red);
          process.exit(1);
        }

        log( ('Pacote inicializado com sucesso no diretório: ' + rootPath).green );
      });

    });
  });
});

