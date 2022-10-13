import { EditorView, basicSetup } from "codemirror";
import { undo, redo, selectAll } from "@codemirror/commands";
import { Language } from "@codemirror/language";
import { findNext, gotoLine, replaceNext, SearchCursor } from "@codemirror/search";
import { Compartment } from "@codemirror/state";
import { ViewUpdate } from "@codemirror/view";
import { NetLogo } from "./lang/netlogo.js";
import { EditorConfig } from "./editor-config.js";
import { highlight } from "./codemirror/style-highlight";
import { indentExtension } from "./codemirror/extension-indent";
import { updateExtension } from "./codemirror/extension-update";

/** GalapagosEditor: The editor component for NetLogo Web / Turtle Universe. */
export class GalapagosEditor {
  /** CodeMirror: The CodeMirror 6 component. */
  public readonly CodeMirror: EditorView;
  /** Options: Options of this editor. */
  public readonly Options: EditorConfig;
  /** editable: compartment of the EditorView. */
  public readonly editable: Compartment;
  /** language: language of the EditorView. */
  public readonly language: Language;
  /** Constructor: Create an editor instance. */

  constructor(parent: HTMLElement, options: EditorConfig) {
    this.editable = new Compartment();
    this.Options = options;
    // this.language = this.Options.Language;
    this.CodeMirror = new EditorView({
      extensions: [
        basicSetup,
        updateExtension(this.onUpdate),
        this.editable.of(EditorView.editable.of(true)),
        NetLogo(),
        highlight,
        indentExtension,
      ],
      parent: parent,
    });
  }

  /** Highlight: Highlight a given snippet of code. */
  // I am not sure how the API should look like.
  // Possible inputs: string => output HTMLElement/HTML string;
  // Or input HTMLElement and replace the HTMLElement into colored HTMLElement.
  Highlight(textContent: string, callback: (text: string, style: string, from: number, to: number) => void, options?: Record<string, any>) {
    // const tree = this.language.parser.parse(textContent);
    // let pos = 0;
    // highlightTree(tree, defaultHighlightStyle.match, (from, to, classes) => {
    //   from > pos && callback(textContent.slice(pos, from), "", pos, from);
    //   callback(textContent.slice(from, to), classes, from, to);
    //   pos = to;
    // });
    // pos != tree.length && callback(textContent.slice(pos, tree.length), "", pos, tree.length);
  }

  // #region "Editor API"
  /** SetCode: Set the code of the editor. */
  SetCode(code: string) {
    this.CodeMirror.dispatch({
      changes: { from: 0, to: this.CodeMirror.state.doc.length, insert: code },
    });
  }
  /** GetCode: Get the code from the editor. */
  GetCode(): string {
    return this.CodeMirror.state.doc.toString();
  }
  /** SetReadOnly: Set the readonly status for the editor. */
  SetReadOnly(status: boolean) {
    this.CodeMirror.dispatch({
      effects: this.editable.reconfigure(EditorView.editable.of(!status)),
    });
  }
  // #endregion

  // #region "Editor Features"
  /** Undo: Make the editor undo. Returns false if no group was available.*/
  Undo() {
    undo(this.CodeMirror);
  }
  /** Redo: Make the editor redo. Returns false if no group was available.*/
  Redo() {
    redo(this.CodeMirror);
  }

  /** Find: Find a keyword in the editor and optionally jump to it. */
  Find(Keyword: string, JumpTo: boolean) {
    // let { state } = this.CodeMirror;
    // let { main, ranges } = state.selection;
    // let word = state.wordAt(main.head), fullWord = word && word.from == main.from && word.to == main.to;
    // for (let cycled = false, cursor = new SearchCursor(state.doc, Keyword, ranges[ranges.length - 1].to);;) {
    //     cursor.next();
    //     this.CodeMirror.focus();
    //     this.CodeMirror.dispatch({ selection: { anchor: cursor.value.from } });
    //     if (cursor.done) {
    //         if (cycled)
    //             return null;
    //         cursor = new SearchCursor(state.doc, Keyword, 0, Math.max(0, ranges[ranges.length - 1].from - 1));
    //         cycled = true;
    //     }
    //     else {
    //         if (cycled && ranges.some(r => r.from == cursor.value.from))
    //             continue;
    //         if (fullWord) {
    //             let word = state.wordAt(cursor.value.from);
    //             if (!word || word.from != cursor.value.from || word.to != cursor.value.to)
    //                 continue;
    //         }
    //         return cursor.value;
    //     }
    // }
  }

  /** Replace: Replace the code in the editor. */
  Replace(Source: string, Target: string) {
    // let { state } = this.CodeMirror, { from, to } = state.selection.main;
    // if (state.readOnly)
    //     return false;
    // let { state } = view, { from, to } = state.selection.main;
    // if (state.readOnly)
    //     return false;
    // let next = query.nextMatch(state, from, from);
    // if (!next)
    //     return false;
    // let changes = [], selection, replacement;
    // let announce = [];
    // if (next.from == from && next.to == to) {
    //     replacement = state.toText(query.getReplacement(next));
    //     changes.push({ from: next.from, to: next.to, insert: replacement });
    //     next = query.nextMatch(state, next.from, next.to);
    //     announce.push(EditorView.announce.of(state.phrase("replaced match on line $", state.doc.lineAt(from).number) + "."));
    // }
    // if (next) {
    //     let off = changes.length == 0 || changes[0].from >= next.to ? 0 : next.to - next.from - replacement.length;
    //     selection = { anchor: next.from - off, head: next.to - off };
    //     announce.push(announceMatch(view, next));
    // }
    // view.dispatch({
    //     changes, selection,
    //     scrollIntoView: !!selection,
    //     effects: announce,
    //     userEvent: "input.replace"
    // });
    // return true;
  }
  /** JumpTo: Jump to a certain line. */
  JumpTo(Line: number) {
    let { state } = this.CodeMirror;
    let docLine = state.doc.line(Math.max(1, Math.min(state.doc.lines, Line)));
    this.CodeMirror.focus();
    this.CodeMirror.dispatch({ selection: { anchor: docLine.from } });
  }
  /** SelectAll: Select all text in the editor. */
  SelectAll() {
    selectAll(this.CodeMirror);
  }
  // #endregion

  // #region "Editor Interfaces"
  /** ShowFind: Show the finding interface. */
  ShowFind() {
    findNext(this.CodeMirror);
  }
  /** ShowReplace: Show the replace interface. */
  ShowReplace() {
    replaceNext(this.CodeMirror);
  }
  /** ShowJumpTo: Show the jump-to-line interface. */
  ShowJumpTo(Line?: number) {
    gotoLine(this.CodeMirror);
  }
  // #endregion

  // #region "Event Handling"
  /** onUpdate: Handle the Update event. */
  private onUpdate(update: ViewUpdate) {
    if (this.Options.OnUpdate) this.Options.OnUpdate(update.docChanged, update);
  }
  // #endregion
}

/** Export classes globally. */
try {
  (window as any).GalapagosEditor = GalapagosEditor;
} catch (error) { }
