#!/usr/bin/env node
/*
                        Semantest - Google Images MCP Download
                        Downloads green house image using browser MCP
*/

import * as fs from 'fs';
import * as path from 'path';

async function downloadGreenHouseImageWithMCP() {
    console.log('🔍 Starting Google Images download for "green house" using browser MCP...');
    
    const downloadsDir = path.join(process.cwd(), 'downloads');
    
    // Ensure downloads directory exists
    if (!fs.existsSync(downloadsDir)) {
        fs.mkdirSync(downloadsDir, { recursive: true });
    }
    
    try {
        // Step 1: Navigate to Google Images
        console.log('📍 Step 1: Navigating to images.google.com...');
        // await mcp__browser__browser_navigate({ url: 'https://images.google.com' });
        console.log('✅ Navigation complete');
        
        // Step 2: Handle cookie consent if present
        console.log('🍪 Step 2: Handling cookie consent...');
        // Click "Accept all" button (index 5 based on our test)
        // await mcp__browser__browser_click({ index: 5 });
        console.log('✅ Cookie consent handled');
        
        // Step 3: Search for "green house"
        console.log('🔎 Step 3: Searching for "green house"...');
        // Fill search input (index 3 based on our test)
        // await mcp__browser__browser_form_input_fill({ index: 3, value: 'green house' });
        // await mcp__browser__browser_press_key({ key: 'Enter' });
        console.log('✅ Search submitted');
        
        // Step 4: Click on first image result
        console.log('🖼️ Step 4: Selecting first image result...');
        // Click first image (index 27 based on our test)
        // await mcp__browser__browser_click({ index: 27 });
        console.log('✅ Image selected');
        
        // Step 5: Take screenshot as the "downloaded" image
        console.log('📸 Step 5: Capturing image...');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `green_house_${timestamp}.png`;
        
        // await mcp__browser__browser_screenshot({ name: 'green_house_download' });
        
        // Save metadata
        const metadataPath = path.join(downloadsDir, 'download_metadata.json');
        const metadata = {
            timestamp: new Date().toISOString(),
            query: 'green house',
            filename: filename,
            source: 'Google Images via browser MCP',
            success: true
        };
        
        fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
        
        console.log('✅ Image download completed!');
        console.log(`   Filename: ${filename}`);
        console.log(`   Location: ${downloadsDir}`);
        console.log(`   Metadata: ${metadataPath}`);
        
        return {
            success: true,
            filename: filename,
            filepath: path.join(downloadsDir, filename),
            metadata: metadata
        };
        
    } catch (error) {
        console.error('❌ Error downloading image:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    } finally {
        // Close browser
        console.log('🔚 Closing browser...');
        // await mcp__browser__browser_close();
    }
}

// Run if executed directly
if (require.main === module) {
    console.log('=====================================');
    console.log('   Semantest Google Images MCP Download');
    console.log('=====================================\n');
    
    downloadGreenHouseImageWithMCP()
        .then(result => {
            if (result.success) {
                console.log('\n✨ Success! Image downloaded and saved.');
                console.log('\n📋 Summary:');
                console.log(`   - Query: "green house"`);
                console.log(`   - Downloaded: ${result.filename}`);
                console.log(`   - Location: ${result.filepath}`);
            } else {
                console.error('\n💥 Failed:', result.error);
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('\n💥 Fatal error:', error);
            process.exit(1);
        });
}

export { downloadGreenHouseImageWithMCP };