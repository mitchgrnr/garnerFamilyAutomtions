const fs = require('fs');
const path = require('path');

// Try finding .env file in the current working directory or standard workspace locations
let envPath = path.resolve('.env');
if (!fs.existsSync(envPath)) {
  envPath = path.resolve(__dirname, '../../../../.env');
}

if (!fs.existsSync(envPath)) {
  console.error("Error: .env file not found.");
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const tokenMatch = envContent.match(/^NOTION_API_TOKEN=(.*)$/m);
const token = tokenMatch ? tokenMatch[1].replace(/['"]/g, '').trim() : null;

if (!token) {
  console.error("Error: NOTION_API_TOKEN not found in .env.");
  process.exit(1);
}

const targetParentId = process.argv[2]; // Optional root page ID filter

async function run() {
  console.log("Querying all pages and databases to build workspace tree...");
  try {
    const res = await fetch("https://api.notion.com/v1/search", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ page_size: 100 })
    });

    if (!res.ok) {
      throw new Error(`API error: ${await res.text()}`);
    }

    const data = await res.json();
    
    // Map items by ID
    const items = {};
    for (const item of data.results) {
      let title = "Untitled";
      if (item.object === "database") {
        title = item.title?.[0]?.plain_text || "Untitled Database";
      } else if (item.object === "page") {
        const titleProp = Object.values(item.properties || {}).find(p => p.type === "title");
        title = titleProp?.title?.[0]?.plain_text || "Untitled Page";
      }
      
      let parentId = null;
      if (item.parent) {
        if (item.parent.type === "page_id") parentId = item.parent.page_id;
        else if (item.parent.type === "database_id") parentId = item.parent.database_id;
        else if (item.parent.type === "workspace") parentId = "workspace";
      }
      
      items[item.id] = {
        id: item.id,
        type: item.object,
        title,
        parentId
      };
    }
    
    // Function to check if an item is a descendant of the target parent
    function getAncestors(itemId) {
      const ancestors = [];
      let current = items[itemId];
      while (current && current.parentId) {
        ancestors.push(current.parentId);
        current = items[current.parentId];
      }
      return ancestors;
    }

    if (targetParentId) {
      console.log(`\n--- Pages under Parent (ID: ${targetParentId}) ---`);
      let found = false;
      for (const item of Object.values(items)) {
        if (item.id === targetParentId) continue;
        
        const ancestors = getAncestors(item.id);
        if (ancestors.includes(targetParentId)) {
          found = true;
          const depth = ancestors.indexOf(targetParentId);
          const indent = "  ".repeat(depth);
          console.log(`${indent}- [${item.type}] ${item.title} (ID: ${item.id})`);
        }
      }
      if (!found) {
        console.log("(No descendants found in the first 100 search results. Ensure the parent ID is correct.)");
      }
    } else {
      console.log("\n--- Full Workspace Tree (top 100 items) ---");
      // Find top-level items (no parent, or parent is workspace, or parent not in search results)
      const topLevelItems = Object.values(items).filter(item => {
        return !item.parentId || item.parentId === "workspace" || !items[item.parentId];
      });

      // Recursive printer
      function printTree(item, depth = 0) {
        const indent = "  ".repeat(depth);
        console.log(`${indent}- [${item.type}] ${item.title} (ID: ${item.id})`);
        
        // Find children
        const children = Object.values(items).filter(child => child.parentId === item.id);
        for (const child of children) {
          printTree(child, depth + 1);
        }
      }

      for (const item of topLevelItems) {
        printTree(item);
      }
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}

run();
