const vscode = require('vscode')

class ActionTreeDataProvider {
  getTreeItem(element) {
    return element
  }
  getChildren() {
    const item = new vscode.TreeItem('Open PandocPro GUI', vscode.TreeItemCollapsibleState.None)
    item.command = { command: 'pandocpro.openGui', title: 'Open PandocPro GUI' }
    item.iconPath = new vscode.ThemeIcon('play-circle')
    return [item]
  }
}

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand('pandocpro.openGui', async () => {
      // Try to run the defined task; fallback to npm run dev if not found.
      const taskName = 'GUI dev (Electron + Vite)'
      try {
        await vscode.commands.executeCommand('workbench.action.tasks.runTask', taskName)
      } catch (err) {
        vscode.window.showErrorMessage(`Failed to run task "${taskName}". Make sure it exists.`)
        // Fallback: run npm run dev in gui/
        const terminal = vscode.window.createTerminal({ name: 'PandocPro GUI', cwd: '${workspaceFolder}/gui' })
        terminal.sendText('npm run dev')
        terminal.show()
      }
    }),
  )

  const provider = new ActionTreeDataProvider()
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('pandocpro.actions', provider)
  )
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
}
