import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import { MarketplaceClient } from '../client';
import { SearchCriteria, Package } from '../types';

export function createSearchCommand(client: MarketplaceClient): Command {
  const command = new Command('search')
    .description('Search for packages in the marketplace')
    .argument('[query]', 'Search query')
    .option('-c, --category <category>', 'Filter by category')
    .option('-t, --tags <tags>', 'Filter by tags (comma-separated)')
    .option('-s, --sort <sort>', 'Sort by (downloads, rating, newest)', 'relevance')
    .option('-l, --limit <limit>', 'Number of results', '20')
    .option('--json', 'Output as JSON')
    .action(async (query: string | undefined, options) => {
      const spinner = ora('Searching packages...').start();
      
      try {
        const criteria: SearchCriteria = {
          query,
          category: options.category,
          tags: options.tags ? options.tags.split(',').map((t: string) => t.trim()) : undefined,
          sortBy: options.sort,
          limit: parseInt(options.limit, 10)
        };
        
        const results = await client.searchPackages(criteria);
        spinner.stop();
        
        if (options.json) {
          console.log(JSON.stringify(results, null, 2));
          return;
        }
        
        if (results.packages.length === 0) {
          console.log(chalk.yellow('No packages found matching your criteria.'));
          return;
        }
        
        displayResults(results.packages, results.total);
      } catch (error) {
        spinner.stop();
        console.error(chalk.red('Error searching packages:'), error.message);
        process.exit(1);
      }
    });
  
  return command;
}

function displayResults(packages: Package[], total: number): void {
  console.log(chalk.green(`\nFound ${total} packages:\n`));
  
  const table = new Table({
    head: [
      chalk.bold('Package'),
      chalk.bold('Version'),
      chalk.bold('Downloads'),
      chalk.bold('Rating'),
      chalk.bold('Price'),
      chalk.bold('Description')
    ],
    colWidths: [30, 10, 12, 8, 12, 40],
    wordWrap: true
  });
  
  packages.forEach(pkg => {
    table.push([
      chalk.cyan(pkg.name),
      pkg.version,
      formatDownloads(pkg.stats.downloads),
      formatRating(pkg.rating),
      formatPrice(pkg.pricing),
      pkg.description.substring(0, 80) + (pkg.description.length > 80 ? '...' : '')
    ]);
  });
  
  console.log(table.toString());
  
  if (packages.length < total) {
    console.log(chalk.gray(`\nShowing ${packages.length} of ${total} results. Use --limit to see more.`));
  }
}

function formatDownloads(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

function formatRating(rating: number): string {
  const stars = '★'.repeat(Math.round(rating));
  const emptyStars = '☆'.repeat(5 - Math.round(rating));
  return chalk.yellow(stars) + chalk.gray(emptyStars);
}

function formatPrice(pricing: any): string {
  if (pricing.type === 'free') return chalk.green('Free');
  if (pricing.type === 'paid') return chalk.yellow(`$${pricing.price}`);
  if (pricing.type === 'freemium') return chalk.blue('Freemium');
  if (pricing.type === 'subscription') {
    return chalk.yellow(`$${pricing.price}/${pricing.billingPeriod}`);
  }
  return 'Contact';
}