import { directives, commands, extensions, reporters, turtleVars, patchVars, linkVars, constants, unsupported, extensionCommands, extensionReporters } from "./keywords"
import { stateExtension } from "../codemirror/extension-state-netlogo"
import { CompletionSource, CompletionContext, CompletionResult } from "@codemirror/autocomplete"
import { syntaxTree } from "@codemirror/language";

/** AutoCompletion: Auto completion service for a NetLogo model. */
export class AutoCompletion {
    /** allIdentifiers: All built-in identifiers. */
    private allIdentifiers = [...directives, ...commands, ...reporters, ...turtleVars, ...patchVars, ...linkVars, ...constants];

    private mapKeyword(Keywords: string[], Type: string) {
        return Keywords.map(function (x) {
            return { label: x, type: Type };
        });
    };

    private maps = {
        "Extensions": this.mapKeyword(extensions, "Extension"),
        "Globals": [],
        "BreedsOwn": [],
        'Breed': []
    };
    
    /** GetCompletion: Get the completion hint at a given context. */
    public GetCompletion(Context: CompletionContext) : CompletionResult | null | Promise<CompletionResult | null> {
        let node = syntaxTree(Context.state).resolveInner(Context.pos, -1);
        let from = /\./.test(node.name) ? node.to : node.from;
        if (
            (node.parent != null && Object.keys(this.maps).indexOf(node.parent.type.name) > -1) ||
            (node.parent != null && node.parent.parent != null && Object.keys(this.maps).indexOf(node.parent.parent.type.name) > -1)
        ) {
            let key = (Object.keys(this.maps).indexOf(node.parent.type.name) > -1 || node.parent.parent == null) ? node.parent.type.name : node.parent.parent.type.name;
            return {
                from,
                options: this.maps[key]
            };
        } else if (node && node.type.name == 'Identifier') {
            let results = this.allIdentifiers;
            // Extensions
            let extensions = Context.state.field(stateExtension).Extensions;
            if (extensions.length > 0)
                results = results.concat(this.FilterExtensions(extensionCommands.concat(extensionReporters), extensions));
            // Mappings
            return {
                from,
                options: this.mapKeyword(results, "Identifier")
            };
        }  else return null;
    }
    /** GetCompletionSource: Get the completion source for a NetLogo model. */
    public GetCompletionSource(): CompletionSource {
        return (Context) => this.GetCompletion(Context);
    };
    /** FilterExtensions: Filter keywords for extensions. */
    private FilterExtensions(Keyword: string[], Extensions: string[]): string[] {
        Extensions = Extensions.map(Extension => Extension + ":");
        return Keyword.filter(Current => Extensions.findIndex(Extension => Current.startsWith(Extension)) != -1);
    }
}