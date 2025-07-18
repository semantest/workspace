import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { MarketplaceClient } from '../client';
import { Package } from '../types';
import fs from 'fs-extra';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export function createInstallCommand(client: MarketplaceClient): Command {
  const command = new Command('install')
    .description('Install a package from the marketplace')
    .argument('<package>', 'Package name or ID to install')
    .option('-v, --version <version>', 'Specific version to install')
    .option('-f, --force', 'Force installation even if already installed')
    .option('-g, --global', 'Install globally')
    .option('--save-dev', 'Save as development dependency')
    .option('--no-save', 'Do not save to package.json')
    .option('-y, --yes', 'Skip confirmation prompts')
    .action(async (packageName: string, options) => {
      const spinner = ora('Fetching package information...').start();
      
      try {
        // Search for the package
        const searchResults = await client.searchPackages({ 
          query: packageName, 
          limit: 5 
        });
        
        if (searchResults.packages.length === 0) {
          spinner.stop();
          console.error(chalk.red(`Package "${packageName}" not found.`));
          process.exit(1);
        }
        
        // Select package if multiple matches
        let selectedPackage: Package;
        if (searchResults.packages.length === 1) {
          selectedPackage = searchResults.packages[0];
        } else {
          spinner.stop();
          const { choice } = await inquirer.prompt([{
            type: 'list',
            name: 'choice',
            message: 'Multiple packages found. Select one:',
            choices: searchResults.packages.map(pkg => ({
              name: `${pkg.name} v${pkg.version} - ${pkg.description}`,
              value: pkg
            }))
          }]);
          selectedPackage = choice;
          spinner.start('Fetching package details...');
        }
        
        // Get full package details
        const packageDetails = await client.getPackage(selectedPackage.id);
        spinner.stop();
        
        // Display package info
        console.log('\n' + chalk.bold('Package Information:'));
        console.log(chalk.cyan('Name:'), packageDetails.name);
        console.log(chalk.cyan('Version:'), packageDetails.version);
        console.log(chalk.cyan('Publisher:'), packageDetails.publisher?.name || 'Unknown');
        console.log(chalk.cyan('License:'), packageDetails.license);
        console.log(chalk.cyan('Price:'), formatPrice(packageDetails.pricing));
        console.log(chalk.cyan('Description:'), packageDetails.description);
        
        // Confirm installation
        if (!options.yes) {
          const { confirm } = await inquirer.prompt([{
            type: 'confirm',
            name: 'confirm',
            message: `Install ${packageDetails.name}@${packageDetails.version}?`,
            default: true
          }]);
          
          if (!confirm) {
            console.log(chalk.yellow('Installation cancelled.'));
            return;
          }
        }
        
        // Handle payment if required
        if (packageDetails.pricing.type !== 'free') {
          console.log(chalk.yellow('\nThis is a paid package.'));
          const { confirmPurchase } = await inquirer.prompt([{
            type: 'confirm',
            name: 'confirmPurchase',
            message: `Purchase for ${formatPrice(packageDetails.pricing)}?`,
            default: false
          }]);
          
          if (!confirmPurchase) {
            console.log(chalk.yellow('Installation cancelled.'));
            return;
          }
          
          // TODO: Implement payment flow
          console.log(chalk.yellow('Payment processing not yet implemented.'));
          return;
        }
        
        // Install the package
        spinner.start('Installing package...');
        
        const installResult = await client.installPackage(
          packageDetails.id,
          options
        );
        
        if (!installResult.success) {
          spinner.stop();
          console.error(chalk.red('Installation failed:'), installResult.message);
          process.exit(1);
        }
        
        // Download and extract package
        await downloadAndExtract(
          installResult.downloadUrl!,
          packageDetails,
          options
        );
        
        // Run post-install scripts
        await runPostInstallScripts(packageDetails, options);
        
        // Update package.json if needed
        if (!options.noSave) {
          await updatePackageJson(packageDetails, options);
        }
        
        spinner.stop();
        
        console.log(chalk.green('\n✓ Package installed successfully!'));
        console.log(chalk.gray(`Location: ${getInstallPath(packageDetails, options)}`));
        
        // Display usage instructions
        if (packageDetails.readme) {
          console.log(chalk.bold('\nQuick Start:'));
          const quickStart = extractQuickStart(packageDetails.readme);
          if (quickStart) {
            console.log(quickStart);
          }
        }
        
      } catch (error) {
        spinner.stop();
        console.error(chalk.red('Error installing package:'), error.message);
        process.exit(1);
      }
    });
  
  return command;
}

async function downloadAndExtract(
  downloadUrl: string,
  packageInfo: Package,
  options: any
): Promise<void> {
  // Implementation would download and extract the package
  console.log(chalk.gray('Downloading from:'), downloadUrl);
  
  const installPath = getInstallPath(packageInfo, options);
  await fs.ensureDir(installPath);
  
  // TODO: Actual download and extraction logic
}

async function runPostInstallScripts(
  packageInfo: Package,
  options: any
): Promise<void> {
  const installPath = getInstallPath(packageInfo, options);
  const packageJsonPath = path.join(installPath, 'package.json');
  
  if (await fs.pathExists(packageJsonPath)) {
    const packageJson = await fs.readJson(packageJsonPath);
    
    if (packageJson.scripts?.postinstall) {
      console.log(chalk.gray('Running post-install scripts...'));
      await execAsync(packageJson.scripts.postinstall, {
        cwd: installPath
      });
    }
  }
}

async function updatePackageJson(
  packageInfo: Package,
  options: any
): Promise<void> {
  const projectPackageJsonPath = path.join(process.cwd(), 'package.json');
  
  if (await fs.pathExists(projectPackageJsonPath)) {
    const packageJson = await fs.readJson(projectPackageJsonPath);
    
    const dependencyKey = options.saveDev ? 'devDependencies' : 'dependencies';
    if (!packageJson[dependencyKey]) {
      packageJson[dependencyKey] = {};
    }
    
    packageJson[dependencyKey][packageInfo.name] = `^${packageInfo.version}`;
    
    await fs.writeJson(projectPackageJsonPath, packageJson, { spaces: 2 });
    console.log(chalk.gray(`Updated ${dependencyKey} in package.json`));
  }
}

function getInstallPath(packageInfo: Package, options: any): string {
  if (options.global) {
    // Global installation path
    return path.join(
      process.env.SEMANTEST_HOME || path.join(process.env.HOME!, '.semantest'),
      'packages',
      packageInfo.name
    );
  }
  
  // Local installation path
  return path.join(
    process.cwd(),
    'semantest_packages',
    packageInfo.name
  );
}

function formatPrice(pricing: any): string {
  if (pricing.type === 'free') return 'Free';
  if (pricing.type === 'paid') return `$${pricing.price}`;
  if (pricing.type === 'freemium') return 'Free with Premium options';
  if (pricing.type === 'subscription') {
    return `$${pricing.price}/${pricing.billingPeriod}`;
  }
  return 'Contact for pricing';
}

function extractQuickStart(readme: string): string | null {
  // Extract quick start section from README
  const quickStartMatch = readme.match(/#+\s*(Quick Start|Getting Started|Usage)([\s\S]*?)(?=#+|$)/i);
  
  if (quickStartMatch) {
    return quickStartMatch[2].trim().split('\n').slice(0, 5).join('\n');
  }
  
  return null;
}