---
name: notion-hierarchy
description: Prints out the hierarchical structure of Notion pages and databases to help understand database schemas, parent-child page relations, and ID mapping.
---

# Notion Hierarchy Skill

Use this skill to view the hierarchical page and database tree of the connected Notion workspace. This helps understand the structure of the workspace, locate specific databases, and find page/database IDs.

## Usage

Run the helper script `list-hierarchy.js` located in the `scripts/` directory of this skill:

```shell
node .agents/skills/notion-hierarchy/scripts/list-hierarchy.js
```

### Specifying a Root Page ID
By default, the script will map and print the entire workspace tree. To filter the tree to only show children of a specific page ID (for example, "The Garner TARDIS databank" ID `26b63b27-c3ba-80b3-8093-f2a9f9978dcc`):

```shell
node .agents/skills/notion-hierarchy/scripts/list-hierarchy.js 26b63b27-c3ba-80b3-8093-f2a9f9978dcc
```
