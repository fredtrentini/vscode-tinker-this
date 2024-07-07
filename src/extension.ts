import * as vscode from 'vscode';


export function activate(context: vscode.ExtensionContext) {
	let disposables = [];

	disposables.push(vscode.commands.registerCommand('tinker-this.runSelection', async () => {
		await vscode.commands.executeCommand('workbench.action.terminal.clear');
		await vscode.commands.executeCommand('workbench.action.tasks.runTask', 'tinker-this: run');
	}));

	disposables.push(vscode.tasks.registerTaskProvider('tinker-this', {
		provideTasks: () => {
			let command = getConsoleCommand();
			if (command === null) {
				vscode.window.showInformationMessage('The tinker command is not available');
				return;
			}
			return [new vscode.Task(
				{ type: "tinker-this", task: "run" },
				2,
				"run",
				'tinker-this',
				new vscode.ShellExecution(command)
			)];
		},
		resolveTask(_task: vscode.Task): vscode.Task | undefined {
			return;
		}
	}));

	function getConsoleCommand() {
		const php = vscode.workspace.getConfiguration('tinker-this').get('phpPath');
		const code = getCode();
		if (code === undefined || code === null || code === "") {
			return null;
		}

		return 'echo "' + getCode() + '"|' + php + ' artisan tinker';
	}

	function getCode() {
		const editor = vscode.window.activeTextEditor;
		if (editor !== undefined) {
			let selection = editor.selection;

			let text =
				selection === undefined || selection.anchor.isEqual(selection.active) ?
					editor.document.getText() : editor.document.getText(selection);

			return prepareCode(text);
		}
	}

    function prepareCode(text: string) {
        const textWithoutComments = removeComments(text);
    
        return textWithoutComments
        .replace(/<\?php/, '')
        .replace(/\r?\n/g, '')
        .replace(/\ +/g, ' ')
        .replace(/"+/g, '\\"')
        .replace(/\$+/g, "\\$");
    }
    
    function removeComments(text: string) {
        const commentInStringRanges = getMatchRanges(text, /(['"])(.|\n)*?(?<!\\)\1/g);
        const commentRanges = getMatchRanges(text, /\/\/.*/g).reverse();
    
        for (const commentRange of commentRanges) {
            if (isRangeCollidingWithRanges(commentRange, commentInStringRanges)) {
                continue;
            }
    
            text = text.slice(0, commentRange[0]) + text.slice(commentRange[1]);
        }
        
        return text;
    }
    
    function getMatchRanges(text: string, regex: RegExp) {
        const ranges: Array<Array<number>> = [];
    
        text.replace(regex, (...args) => {
            const match = args[0];
            const offset = args[args.length - 2];

            ranges.push([offset, offset + match.length]);
        });
    
        return ranges;
    }
    
    function isRangeCollidingWithRanges(targetRange: Array<number>, ranges: Array<Array<number>>) {
        return ranges.some((range: Array<number>) => {
            return !(targetRange[1] <= range[0] || targetRange[0] >= targetRange[1]);
        });
    }

	context.subscriptions.push(...disposables);
}

// this method is called when your extension is deactivated
export function deactivate() { }
