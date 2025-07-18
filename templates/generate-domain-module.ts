#!/usr/bin/env node
/**
 * Domain Module Generator
 * 
 * Creates a new domain module from templates with proper DDD structure
 * 
 * Usage:
 *   node generate-domain-module.ts <domain-name> <description>
 * 
 * Example:
 *   node generate-domain-module.ts youtube.com "YouTube video automation"
 */

import * as fs from 'fs';
import * as path from 'path';

interface ModuleConfig {
  domainName: string;
  domainDescription: string;
  domainKeyword: string;
  version: string;
  mainEntityClass: string;
  mainValueObjectClass: string;
  mainEventClass: string;
  mainServiceClass: string;
  mainEntityFilename: string;
  mainValueObjectFilename: string;
  mainEventFilename: string;
  mainRepositoryFilename: string;
  mainServiceFilename: string;
  mainApplicationServiceFilename: string;
  mainAdapterFilename: string;
  capabilitiesList: string;
  entityDescription: string;
  valueObjectDescription: string;
  eventDescription: string;
  serviceDescription: string;
  exampleUsage: string;
}

function generateModuleConfig(domainName: string, description: string): ModuleConfig {
  const capitalizedName = domainName.split('.').map(part => 
    part.charAt(0).toUpperCase() + part.slice(1)
  ).join('');

  const keyword = domainName.split('.')[0];
  const entityName = capitalizedName.replace(/\.com$/, '');

  return {
    domainName,
    domainDescription: description,
    domainKeyword: keyword,
    version: '1.0.0',
    mainEntityClass: `${entityName}Entity`,
    mainValueObjectClass: `${entityName}Id`,
    mainEventClass: `${entityName}Event`,
    mainServiceClass: `${entityName}Service`,
    mainEntityFilename: domainName.replace(/\./g, '-'),
    mainValueObjectFilename: `${domainName.replace(/\./g, '-')}-id`,
    mainEventFilename: `${domainName.replace(/\./g, '-')}-event`,
    mainRepositoryFilename: domainName.replace(/\./g, '-'),
    mainServiceFilename: domainName.replace(/\./g, '-'),
    mainApplicationServiceFilename: `${domainName.replace(/\./g, '-')}-application`,
    mainAdapterFilename: `${domainName.replace(/\./g, '-')}-adapter`,
    capabilitiesList: `'${keyword}-automation', '${keyword}-integration'`,
    entityDescription: `Main ${entityName} entity`,
    valueObjectDescription: `${entityName} identifier`,
    eventDescription: `${entityName} domain event`,
    serviceDescription: `${entityName} application service`,
    exampleUsage: `service = new ${entityName}Service();`
  };
}

function replaceTemplateVariables(content: string, config: ModuleConfig): string {
  return content
    .replace(/{{DOMAIN_NAME}}/g, config.domainName)
    .replace(/{{DOMAIN_DESCRIPTION}}/g, config.domainDescription)
    .replace(/{{DOMAIN_KEYWORD}}/g, config.domainKeyword)
    .replace(/{{VERSION}}/g, config.version)
    .replace(/{{MAIN_ENTITY_CLASS}}/g, config.mainEntityClass)
    .replace(/{{MAIN_VALUE_OBJECT_CLASS}}/g, config.mainValueObjectClass)
    .replace(/{{MAIN_EVENT_CLASS}}/g, config.mainEventClass)
    .replace(/{{MAIN_SERVICE_CLASS}}/g, config.mainServiceClass)
    .replace(/{{MAIN_ENTITY_FILENAME}}/g, config.mainEntityFilename)
    .replace(/{{MAIN_VALUE_OBJECT_FILENAME}}/g, config.mainValueObjectFilename)
    .replace(/{{MAIN_EVENT_FILENAME}}/g, config.mainEventFilename)
    .replace(/{{MAIN_REPOSITORY_FILENAME}}/g, config.mainRepositoryFilename)
    .replace(/{{MAIN_SERVICE_FILENAME}}/g, config.mainServiceFilename)
    .replace(/{{MAIN_APPLICATION_SERVICE_FILENAME}}/g, config.mainApplicationServiceFilename)
    .replace(/{{MAIN_ADAPTER_FILENAME}}/g, config.mainAdapterFilename)
    .replace(/{{CAPABILITIES_LIST}}/g, config.capabilitiesList)
    .replace(/{{ENTITY_DESCRIPTION}}/g, config.entityDescription)
    .replace(/{{VALUE_OBJECT_DESCRIPTION}}/g, config.valueObjectDescription)
    .replace(/{{EVENT_DESCRIPTION}}/g, config.eventDescription)
    .replace(/{{SERVICE_DESCRIPTION}}/g, config.serviceDescription)
    .replace(/{{EXAMPLE_USAGE}}/g, config.exampleUsage);
}

function createDirectoryStructure(basePath: string): void {
  const directories = [
    'domain/entities',
    'domain/events',
    'domain/value-objects',
    'domain/repositories',
    'domain/services',
    'application/services',
    'application/handlers',
    'infrastructure/adapters',
    'infrastructure/adapters/interfaces',
    'infrastructure/repositories',
    'tests/unit',
    'tests/integration',
    'tests/e2e',
    'src'
  ];

  directories.forEach(dir => {
    const fullPath = path.join(basePath, dir);
    fs.mkdirSync(fullPath, { recursive: true });
  });
}

function processTemplateFile(templatePath: string, outputPath: string, config: ModuleConfig): void {
  try {
    const content = fs.readFileSync(templatePath, 'utf8');
    const processedContent = replaceTemplateVariables(content, config);
    fs.writeFileSync(outputPath, processedContent);
    console.log(`✅ Created: ${outputPath}`);
  } catch (error) {
    console.error(`❌ Error processing ${templatePath}:`, error);
  }
}

function generateDomainModule(domainName: string, description: string): void {
  const config = generateModuleConfig(domainName, description);
  const templateDir = path.join(__dirname, 'domain-module');
  const outputDir = path.join(__dirname, '..', domainName);

  // Check if module already exists
  if (fs.existsSync(outputDir)) {
    console.error(`❌ Module ${domainName} already exists!`);
    process.exit(1);
  }

  console.log(`🏗️  Generating domain module: ${domainName}`);
  console.log(`📝 Description: ${description}`);
  console.log(`📁 Output directory: ${outputDir}`);

  // Create directory structure
  createDirectoryStructure(outputDir);

  // Process templates
  const templates = [
    { src: 'package.json.template', dest: 'package.json' },
    { src: 'tsconfig.json.template', dest: 'tsconfig.json' },
    { src: 'jest.config.js.template', dest: 'jest.config.js' },
    { src: 'README.md.template', dest: 'README.md' },
    { src: 'src/index.ts.template', dest: 'src/index.ts' },
    { src: 'domain/entities/index.ts.template', dest: 'domain/entities/index.ts' },
    { src: 'domain/value-objects/index.ts.template', dest: 'domain/value-objects/index.ts' },
    { src: 'domain/events/index.ts.template', dest: 'domain/events/index.ts' },
    { src: 'domain/repositories/index.ts.template', dest: 'domain/repositories/index.ts' },
    { src: 'domain/services/index.ts.template', dest: 'domain/services/index.ts' },
    { src: 'application/services/index.ts.template', dest: 'application/services/index.ts' },
    { src: 'infrastructure/adapters/interfaces/index.ts.template', dest: 'infrastructure/adapters/interfaces/index.ts' },
    { src: 'tests/setup.ts.template', dest: 'tests/setup.ts' }
  ];

  templates.forEach(template => {
    const templatePath = path.join(templateDir, template.src);
    const outputPath = path.join(outputDir, template.dest);
    processTemplateFile(templatePath, outputPath, config);
  });

  console.log(`\n✅ Successfully generated domain module: ${domainName}`);
  console.log(`\n🚀 Next steps:`);
  console.log(`   cd ${domainName}`);
  console.log(`   npm install`);
  console.log(`   npm run build`);
  console.log(`   npm test`);
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: node generate-domain-module.ts <domain-name> <description>');
    console.error('Example: node generate-domain-module.ts youtube.com "YouTube video automation"');
    process.exit(1);
  }

  const [domainName, description] = args;
  generateDomainModule(domainName, description);
}

export { generateDomainModule };