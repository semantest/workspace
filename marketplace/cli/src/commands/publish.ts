import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';
import glob from 'glob';
import { MarketplaceClient } from '../client';
import { PackageData, Pricing } from '../types';
import semver from 'semver';

export function createPublishCommand(client: MarketplaceClient): Command {
  const command = new Command('publish')
    .description('Publish a package to the marketplace')
    .option('-d, --directory <dir>', 'Package directory', '.')
    .option('--dry-run', 'Perform a dry run without publishing')
    .option('--access <level>', 'Access level (public, restricted)', 'public')
    .action(async (options) => {
      const spinner = ora('Preparing package...').start();
      
      try {
        // Check if logged in
        const isAuthenticated = await client.isAuthenticated();
        if (!isAuthenticated) {
          spinner.stop();
          console.error(chalk.red('You must be logged in to publish packages.'));
          console.log(chalk.gray('Run "semantest login" to authenticate.'));
          process.exit(1);
        }
        
        // Read package.json
        const packageJsonPath = path.join(options.directory, 'package.json');
        if (!await fs.pathExists(packageJsonPath)) {
          spinner.stop();
          console.error(chalk.red('No package.json found in the current directory.'));
          process.exit(1);
        }
        
        const packageJson = await fs.readJson(packageJsonPath);
        spinner.stop();
        
        // Validate package.json
        const validation = validatePackageJson(packageJson);
        if (!validation.valid) {
          console.error(chalk.red('Invalid package.json:'));
          validation.errors.forEach(error => {
            console.error(chalk.red(`  - ${error}`));
          });
          process.exit(1);
        }
        
        // Check if package exists
        const existingPackage = await client.checkPackageExists(packageJson.name);
        if (existingPackage) {
          // Check version
          if (!semver.gt(packageJson.version, existingPackage.version)) {
            console.error(chalk.red(
              `Version ${packageJson.version} must be greater than existing version ${existingPackage.version}`
            ));
            process.exit(1);
          }
        }
        
        // Collect package metadata
        console.log(chalk.bold('\nPackage Information:'));
        console.log(chalk.cyan('Name:'), packageJson.name);
        console.log(chalk.cyan('Version:'), packageJson.version);
        console.log(chalk.cyan('Description:'), packageJson.description);
        
        // Prompt for additional metadata
        const metadata = await promptForMetadata(packageJson);
        
        // Prepare package data
        spinner.start('Analyzing package...');
        const packageData = await preparePackageData(
          options.directory,
          packageJson,
          metadata
        );
        spinner.stop();
        
        // Display summary
        console.log(chalk.bold('\nPublish Summary:'));
        console.log(chalk.cyan('Category:'), packageData.category);
        console.log(chalk.cyan('Tags:'), packageData.tags.join(', '));
        console.log(chalk.cyan('License:'), packageData.license);
        console.log(chalk.cyan('Pricing:'), formatPricing(packageData.pricing));
        console.log(chalk.cyan('Files:'), packageData.files.length);
        console.log(chalk.cyan('Tests:'), packageData.tests.length);
        
        // Confirm publication
        if (!options.dryRun) {
          const { confirm } = await inquirer.prompt([{
            type: 'confirm',
            name: 'confirm',
            message: 'Publish this package?',
            default: true
          }]);
          
          if (!confirm) {
            console.log(chalk.yellow('Publication cancelled.'));
            return;
          }
        }
        
        if (options.dryRun) {
          console.log(chalk.yellow('\nDry run complete. Package not published.'));
          return;
        }
        
        // Publish package
        spinner.start('Publishing package...');
        const result = await client.publishPackage(packageData);
        spinner.stop();
        
        if (result.success) {
          console.log(chalk.green('\n✓ Package published successfully!'));
          console.log(chalk.gray(`Package ID: ${result.packageId}`));
          console.log(chalk.gray(`Status: ${result.status}`));
          
          if (result.status === 'pending_review') {
            console.log(chalk.yellow(
              `\nYour package is under review. ${result.estimatedReviewTime}`
            ));
          }
          
          console.log(chalk.bold('\nNext steps:'));
          console.log('  - View your package: ' + 
            chalk.cyan(`semantest marketplace view ${packageJson.name}`));
          console.log('  - Check analytics: ' + 
            chalk.cyan('semantest marketplace stats'));
        } else {
          console.error(chalk.red('\nPublication failed:'));
          result.errors?.forEach(error => {
            console.error(chalk.red(`  - ${error}`));
          });
          
          if (result.qualityReport) {
            console.log(chalk.yellow('\nQuality Report:'));
            Object.entries(result.qualityReport).forEach(([metric, score]) => {
              const color = score >= 80 ? chalk.green : 
                           score >= 60 ? chalk.yellow : chalk.red;
              console.log(`  ${metric}: ${color(score + '%')}`);
            });
          }
        }
        
      } catch (error) {
        spinner.stop();
        console.error(chalk.red('Error publishing package:'), error.message);
        process.exit(1);
      }
    });
  
  return command;
}

function validatePackageJson(packageJson: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!packageJson.name) errors.push('Missing "name" field');
  if (!packageJson.version) errors.push('Missing "version" field');
  if (!packageJson.description) errors.push('Missing "description" field');
  if (!packageJson.author) errors.push('Missing "author" field');
  if (!packageJson.license) errors.push('Missing "license" field');
  
  if (packageJson.name && !isValidPackageName(packageJson.name)) {
    errors.push('Invalid package name format');
  }
  
  if (packageJson.version && !semver.valid(packageJson.version)) {
    errors.push('Invalid version format (must follow semver)');
  }
  
  return { valid: errors.length === 0, errors };
}

function isValidPackageName(name: string): boolean {
  return /^[@a-z0-9-~][a-z0-9-._~]*\/[a-z0-9-._~]+$/.test(name);
}

async function promptForMetadata(packageJson: any): Promise<any> {
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'category',
      message: 'Select category:',
      choices: [
        'test-patterns',
        'plugins',
        'themes',
        'integrations',
        'ai-models',
        'domain-modules'
      ],
      default: 'plugins'
    },
    {
      type: 'input',
      name: 'tags',
      message: 'Enter tags (comma-separated):',
      filter: (input: string) => input.split(',').map(t => t.trim()).filter(Boolean)
    },
    {
      type: 'list',
      name: 'pricingType',
      message: 'Select pricing model:',
      choices: [
        { name: 'Free', value: 'free' },
        { name: 'One-time payment', value: 'paid' },
        { name: 'Freemium', value: 'freemium' },
        { name: 'Subscription', value: 'subscription' }
      ],
      default: 'free'
    }
  ]);
  
  // Additional pricing details if not free
  if (answers.pricingType !== 'free') {
    const pricingDetails = await inquirer.prompt([
      {
        type: 'number',
        name: 'price',
        message: 'Enter price (USD):',
        validate: (value: number) => value > 0 || 'Price must be greater than 0'
      }
    ]);
    
    if (answers.pricingType === 'subscription') {
      const billingPeriod = await inquirer.prompt([
        {
          type: 'list',
          name: 'billingPeriod',
          message: 'Select billing period:',
          choices: ['monthly', 'yearly']
        }
      ]);
      Object.assign(pricingDetails, billingPeriod);
    }
    
    Object.assign(answers, pricingDetails);
  }
  
  return answers;
}

async function preparePackageData(
  directory: string,
  packageJson: any,
  metadata: any
): Promise<PackageData> {
  // Read README
  const readmePath = path.join(directory, 'README.md');
  const readme = await fs.pathExists(readmePath) ? 
    await fs.readFile(readmePath, 'utf-8') : '';
  
  // Find files to include
  const files = await findFiles(directory);
  const tests = files.filter(f => 
    f.includes('test') || f.includes('spec') || f.includes('__tests__')
  );
  
  // Prepare pricing
  const pricing: Pricing = {
    type: metadata.pricingType,
    price: metadata.price,
    currency: metadata.price ? 'USD' : undefined,
    billingPeriod: metadata.billingPeriod
  };
  
  return {
    name: packageJson.name,
    version: packageJson.version,
    description: packageJson.description,
    category: metadata.category,
    tags: metadata.tags || [],
    pricing,
    license: packageJson.license,
    requirements: {
      semantestVersion: packageJson.peerDependencies?.['@semantest/core'] || '*',
      dependencies: packageJson.dependencies || {}
    },
    readme,
    files: files.filter(f => !tests.includes(f)),
    tests
  };
}

async function findFiles(directory: string): Promise<string[]> {
  const ignore = [
    'node_modules/**',
    '.git/**',
    '*.log',
    '.env*',
    'dist/**',
    'build/**',
    'coverage/**'
  ];
  
  return new Promise((resolve, reject) => {
    glob('**/*', {
      cwd: directory,
      ignore,
      nodir: true
    }, (err, files) => {
      if (err) reject(err);
      else resolve(files);
    });
  });
}

function formatPricing(pricing: Pricing): string {
  if (pricing.type === 'free') return 'Free';
  if (pricing.type === 'paid') return `$${pricing.price} (one-time)`;
  if (pricing.type === 'freemium') return 'Free with premium features';
  if (pricing.type === 'subscription') {
    return `$${pricing.price}/${pricing.billingPeriod}`;
  }
  return 'Unknown';
}