import { EditorView, basicSetup } from 'codemirror';
import { undo, redo, selectAll, indentWithTab } from '@codemirror/commands';
import { closeCompletion, acceptCompletion } from '@codemirror/autocomplete';
import {
  forceParsing,
  LanguageSupport,
  syntaxTree,
} from '@codemirror/language';
import {
  replaceAll,
  selectMatches,
  SearchQuery,
  findNext,
  gotoLine,
  replaceNext,
  setSearchQuery,
  openSearchPanel,
  closeSearchPanel,
} from '@codemirror/search';
import { Prec, Compartment, EditorState, Extension } from '@codemirror/state';
import { ViewUpdate, keymap } from '@codemirror/view';
import { NetLogo } from './lang/netlogo.js';
import { EditorConfig, EditorLanguage, ParseMode } from './editor-config';
import { highlight, highlightStyle } from './codemirror/style-highlight';
import { updateExtension } from './codemirror/extension-update';
import {
  stateExtension,
  StateNetLogo,
} from './codemirror/extension-state-netlogo';
import {
  preprocessStateExtension,
  StatePreprocess,
} from './codemirror/extension-state-preprocess.js';
import { buildToolTips } from './codemirror/extension-tooltip';
import { lightTheme } from './codemirror/theme-light';
import { highlightTree } from '@lezer/highlight';
import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { netlogoLinters } from './lang/linters/linters';
import {
  CompilerLinter,
  RuntimeError,
  RuntimeLinter,
} from './lang/linters/runtime-linter.js';
import { Dictionary } from './i18n/dictionary.js';
import { prettify, prettifyAll } from './codemirror/prettify.js';
import { forEachDiagnostic, Diagnostic, linter } from '@codemirror/lint';
import { LocalizationManager } from './i18n/localized.js';
import { Tree, SyntaxNodeRef } from '@lezer/common';
import { buildLinter } from './lang/linters/linter-builder.js';
import { PreprocessContext, LintContext } from './lang/classes.js';

/** GalapagosEditor: The editor component for NetLogo Web / Turtle Universe. */
export class GalapagosEditor {
  /** CodeMirror: The CodeMirror 6 component. */
  public readonly CodeMirror: EditorView;
  /** Options: Options of this editor. */
  public readonly Options: EditorConfig;
  /** Editable: Compartment of the EditorView. */
  private readonly Editable: Compartment;
  /** Language: Language of the EditorView. */
  public readonly Language: LanguageSupport;
  /** Parent: Parent HTMLElement of the EditorView. */
  public readonly Parent: HTMLElement;
  /** Linters: The linters used in this instance. */
  public readonly Linters: Extension[] = [];
  /** DebugEnabled: Whether the debug output is enabled. */
  public static DebugEnabled: boolean;

  /** Constructor: Create an editor instance. */
  constructor(Parent: HTMLElement, Options: EditorConfig) {
    this.Editable = new Compartment();
    this.Parent = Parent;
    this.Options = Options;

    // Extensions
    const Extensions = [
      // Editor
      basicSetup,
      lightTheme,
      // Readonly
      this.Editable.of(EditorView.editable.of(!this.Options.ReadOnly)),
      // Events
      updateExtension((Update) => this.onUpdate(Update)),
      highlight,
      // indentExtension
      keymap.of([indentWithTab]),
    ];

    // Language-specific
    switch (Options.Language) {
      case EditorLanguage.Javascript:
        this.Language = javascript();
        break;
      case EditorLanguage.CSS:
        this.Language = css();
        break;
      case EditorLanguage.HTML:
        this.Language = html();
        break;
      default:
        this.Language = NetLogo(this);
        Extensions.push(preprocessStateExtension);
        Extensions.push(stateExtension);
        Dictionary.ClickHandler = Options.OnDictionaryClick;
        this.Linters = netlogoLinters.map((linter) =>
          buildLinter(linter, this)
        );
        // Special case: One-line mode
        if (!this.Options.OneLine) {
          Extensions.push(buildToolTips(this));
        } else {
          Extensions.unshift(
            Prec.highest(keymap.of([{ key: 'Enter', run: () => true }]))
          );
          Extensions.unshift(
            Prec.highest(keymap.of([{ key: 'Tab', run: acceptCompletion }]))
          );
        }
        Extensions.push(...this.Linters);
        Extensions.push(linter(CompilerLinter));
        Extensions.push(linter(RuntimeLinter));
    }
    Extensions.push(this.Language);

    // DOM handlers
    Extensions.push(
      EditorView.domEventHandlers({
        keydown: Options.OnKeyDown,
        keyup: Options.OnKeyUp,
      })
    );

    // One-line mode
    if (this.Options.OneLine) {
      Extensions.push(
        EditorState.transactionFilter.of((tr) =>
          tr.newDoc.lines > 1 ? [] : tr
        )
      );
    }

    // Wrapping mode
    if (this.Options.Wrapping) {
      Extensions.push(EditorView.lineWrapping);
    }

    // Build the editor
    this.CodeMirror = new EditorView({
      extensions: Extensions,
      parent: Parent,
    });
    this.GetPreprocessState().Context = this.PreprocessContext;
    this.GetPreprocessState().SetEditor(this);
    this.GetState().Mode = this.Options.ParseMode ?? ParseMode.Normal;

    // Disable Grammarly
    const el = this.Parent.getElementsByClassName('cm-content')[0];
    el.setAttribute('data-enable-grammarly', 'false');
  }

  // #region "Highlighting & Linting"
  /** Highlight: Highlight a given snippet of code. */
  Highlight(Content: string): HTMLElement {
    var LastPosition = 0;
    const Container = document.createElement('span');
    this.highlightInternal(Content, (Text, Style, From, To) => {
      if (Style == '') {
        var Lines = Text.split('\n');
        for (var I = 0; I < Lines.length; I++) {
          var Line = Lines[I];
          var Span = document.createElement('span');
          Span.innerText = Line;
          Span.innerHTML = Span.innerHTML.replace(/ /g, '&nbsp;');
          Container.appendChild(Span);
          if (I != Lines.length - 1)
            Container.appendChild(document.createElement('br'));
        }
      } else {
        const Node = document.createElement('span');
        Node.innerText = Text;
        Node.innerHTML = Node.innerHTML.replace(' ', '&nbsp;');
        Node.className = Style;
        Container.appendChild(Node);
      }
      LastPosition = To;
    });
    return Container;
  }

  // The internal method for highlighting.
  private highlightInternal(
    Content: string,
    callback: (text: string, style: string, from: number, to: number) => void,
    options?: Record<string, any>
  ) {
    const tree = this.Language.language.parser.parse(Content);
    let pos = 0;
    highlightTree(tree, highlightStyle, (from, to, classes) => {
      from > pos && callback(Content.slice(pos, from), '', pos, from);
      callback(Content.slice(from, to), classes, from, to);
      pos = to;
    });
    pos != tree.length &&
      callback(Content.slice(pos, tree.length), '', pos, tree.length);
  }
  // #endregion

  // #region "Editor Statuses"
  /** GetState: Get the current parser state of the NetLogo code. */
  GetState(Refresh?: boolean): StateNetLogo {
    if (Refresh) this.UpdateContext();
    return this.CodeMirror.state.field(stateExtension);
  }

  /** GetPreprocessState: Get the preprocess parser state of the NetLogo code. */
  GetPreprocessState(): StatePreprocess {
    return this.CodeMirror.state.field(preprocessStateExtension);
  }

  /** GetSyntaxTree: Get the syntax tree of the NetLogo code. */
  GetSyntaxTree(): Tree {
    return syntaxTree(this.CodeMirror.state);
  }

  /** SyntaxNodesAt: Iterate through syntax nodes at a certain position. */
  SyntaxNodesAt(Position: number, Callback: (Node: SyntaxNodeRef) => void) {
    this.GetSyntaxTree().cursorAt(Position).iterate(Callback);
  }

  /** GetRecognizedMode: Get the recognized program mode. */
  GetRecognizedMode(): string {
    var Name = this.GetSyntaxTree().topNode?.firstChild?.name;
    switch (Name) {
      case 'Embedded':
        return 'Command';
      case 'OnelineReporter':
        return 'Reporter';
      case 'Normal':
        return 'Model';
      default:
        return 'Unknown';
    }
  }
  // #endregion

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
      effects: this.Editable.reconfigure(EditorView.editable.of(!status)),
    });
  }

  /** AddChild: Add a child editor. */
  AddChild(child: GalapagosEditor) {
    if (child.Children.length > 0)
      throw new Error(
        'Cannot add an editor that already has children as child.'
      );
    this.Children.push(child);
    child.ID = this.Children.length;
    child.ParentEditor = this;
    child.PreprocessContext = this.PreprocessContext;
    child.LintContext = this.LintContext;
    child.GetPreprocessState().Context = this.PreprocessContext;
  }

  /** GetCursorPosition: Set the cursor position of the editor. */
  GetCursorPosition(): number {
    return this.CodeMirror.state.selection.ranges[0]?.from ?? 0;
  }

  /** SetCursorPosition: Set the cursor position of the editor. */
  SetCursorPosition(position: number) {
    this.CodeMirror.dispatch({
      selection: { anchor: position },
      scrollIntoView: true,
    });
  }

  /** GetSelections: Get the selections of the editor. */
  GetSelections() {
    return this.CodeMirror.state.selection.ranges;
  }

  /** RefreshCursor: Refresh the cursor position. */
  RefreshCursor() {
    this.SetCursorPosition(this.GetCursorPosition());
  }

  /** Blur: Make the editor lose the focus (if any). */
  Blur() {
    this.CodeMirror.contentDOM.blur();
  }

  /** Focus: Make the editor gain the focus (if possible). */
  Focus() {
    this.CodeMirror.focus();
  }

  /** Prettify: Prettify the selection ofNetLogo code. */
  Prettify() {
    prettify(this.CodeMirror);
  }

  /** PrettifyAll: Prettify all the NetLogo code. */
  PrettifyAll() {
    this.ForceParse();
    prettifyAll(this.CodeMirror);
  }

  /** CloseCompletion: Forcible close the auto completion. */
  CloseCompletion() {
    closeCompletion(this.CodeMirror);
  }

  /** SetWidgetVariables: Sync the widget-defined global variables to the syntax parser/linter. */
  SetWidgetVariables(Variables: string[], ForceLint?: boolean) {
    if (this.ParentEditor != null)
      throw new Error('Cannot set widget variables on a child editor.');
    var State = this.GetState();
    var Current = State.WidgetGlobals;
    var Changed = Current.length != Variables.length;
    if (!Changed) {
      for (var I = 0; I < Variables.length; I++) {
        if (Current[I] != Variables[I]) {
          Changed = true;
          break;
        }
      }
    }
    if (Changed) {
      State.WidgetGlobals = Variables.map((str) => str.toLowerCase());
      State.SetDirty();
      this.UpdateContext();
      if (ForceLint) this.ForceLint();
    }
  }

  /** SetMode: Set the parsing mode of the editor. */
  SetMode(Mode: ParseMode, ForceLint?: boolean) {
    var State = this.GetState();
    var Current = State.Mode;
    if (Current != Mode) {
      State.Mode = Mode;
      this.UpdateContext();
      if (ForceLint) this.ForceLint();
    }
  }

  /** SetCompilerErrors: Sync the compiler errors and present it on the editor. */
  // TODO: Some errors come with start 2147483647, which needs to be rendered as a tip without position.
  SetCompilerErrors(Errors: RuntimeError[]) {
    var State = this.GetState();
    if (
      State.CompilerErrors.length == 0 &&
      State.RuntimeErrors.length == 0 &&
      Errors.length == 0
    )
      return;
    State.CompilerErrors = Errors;
    State.RuntimeErrors = [];
    this.ForceLint();
  }

  /** SetCompilerErrors: Sync the runtime errors and present it on the editor. */
  SetRuntimeErrors(Errors: RuntimeError[]) {
    var State = this.GetState();
    if (State.RuntimeErrors.length == 0 && Errors.length == 0) return;
    State.RuntimeErrors = Errors;
    this.ForceLint();
  }
  // #endregion

  // #region " Share Context "
  /** ID: ID of the editor. */
  private ID: number = 0;
  /** Children: The connected editors. */
  public readonly Children: GalapagosEditor[] = [];
  /** ParentEditor: The parent editor of this instance. */
  public ParentEditor: GalapagosEditor | null = null;
  /** PreprocessContext: The combined preprocessed context of this editor. */
  public PreprocessContext: PreprocessContext = new PreprocessContext();
  /** LintContext: The combined main parsing context of this editor. */
  public LintContext: LintContext = new LintContext();
  /** Version: Version of the state (for linter cache). */
  private Version: number = 0;
  /** IsVisible: Whether this editor is visible. */
  public IsVisible: boolean = true;
  /** GetID: Get ID of the editor. */
  public GetID(): number {
    return this.ID;
  }
  /** GetVersion: Get version of the state. */
  public GetVersion(): number {
    return this.Version;
  }
  public SetVisible(status: boolean) {
    if (this.IsVisible == status) return;
    this.IsVisible = status;
    if (this.IsVisible) this.ForceLint();
  }
  /** UpdateContext: Try to update the context of this editor. */
  public UpdateContext(): boolean {
    const State = this.CodeMirror.state.field(stateExtension);
    if (!State.GetDirty()) return false;
    // Force the parsing
    this.ForceParse();
    this.Version += 1;
    State.ParseState(this.CodeMirror.state);
    // Update the shared editor, if needed
    if (!this.ParentEditor) {
      this.UpdateSharedContext();
    } else if (
      this.ParentEditor &&
      this.Options.ParseMode == ParseMode.Normal
    ) {
      this.ParentEditor.UpdateContext();
    }
    return true;
  }
  /** UpdateSharedContext: Update the shared context of the editor. */
  private UpdateSharedContext() {
    var mainLint = this.LintContext.Clear();
    for (var child of [...this.Children, this]) {
      if (child.Options.ParseMode == ParseMode.Normal || child == this) {
        let statenetlogo = child.CodeMirror.state.field(stateExtension);
        for (var p of statenetlogo.Extensions) {
          mainLint.Extensions.set(p, child.ID);
        }
        for (var p of statenetlogo.Globals) {
          mainLint.Globals.set(p, child.ID);
        }
        for (var p of statenetlogo.WidgetGlobals) {
          mainLint.WidgetGlobals.set(p, child.ID);
        }
        for (var p of statenetlogo.Procedures.keys()) {
          let copy = statenetlogo.Procedures.get(p);
          if (copy) {
            copy.EditorId = child.ID;
            mainLint.Procedures.set(p, copy);
          }
        }
        for (var p of statenetlogo.Breeds.keys()) {
          let copy = statenetlogo.Breeds.get(p);
          if (copy) {
            copy.EditorId = child.ID;
            mainLint.Breeds.set(p, copy);
          }
        }
      }
    }
    this.RefreshContexts();
  }
  /** RefreshContexts: Refresh contexts of the editor. */
  private RefreshContexts() {
    if (this.IsVisible) {
      this.ForceParse(false);
      this.ForceLint();
    }
    for (var child of this.Children) {
      child.Version += 1;
      child.RefreshContexts();
    }
  }
  /** UpdatePreprocessContext: Try to update the context of this editor. */
  public UpdatePreprocessContext(): boolean {
    const State = this.CodeMirror.state.field(preprocessStateExtension);
    // Force the parsing
    this.Version += 1;
    // Update the shared editor, if needed
    if (!this.ParentEditor) {
      this.UpdateSharedPreprocess();
    } else if (
      this.ParentEditor &&
      this.Options.ParseMode == ParseMode.Normal
    ) {
      this.ParentEditor.UpdatePreprocessContext();
    }
    return true;
  }
  /** UpdateSharedPreprocess: Update the shared preprocess context of the editor. */
  private UpdateSharedPreprocess() {
    var mainPreprocess = this.PreprocessContext.Clear();
    for (var child of [...this.Children, this]) {
      if (child.Options.ParseMode == ParseMode.Normal || child == this) {
        let preprocess = child.CodeMirror.state.field(preprocessStateExtension);
        for (var p of preprocess.PluralBreeds) {
          mainPreprocess.PluralBreeds.set(p, child.ID);
        }
        for (var p of preprocess.SingularBreeds) {
          mainPreprocess.SingularBreeds.set(p, child.ID);
        }
        for (var p of preprocess.BreedVars) {
          mainPreprocess.BreedVars.set(p, child.ID);
        }
        for (var [p, num_args] of preprocess.Commands) {
          mainPreprocess.Commands.set(p, num_args);
          mainPreprocess.CommandsOrigin.set(p, child.ID);
        }
        for (var [p, num_args] of preprocess.Reporters) {
          mainPreprocess.Reporters.set(p, num_args);
          mainPreprocess.ReportersOrigin.set(p, child.ID);
        }
      }
    }
  }
  // #endregion

  // #region "Diagnostics"
  /** ForEachDiagnostic: Loop through all linting diagnostics throughout the code. */
  ForEachDiagnostic(
    Callback: (d: Diagnostic, from: number, to: number) => void
  ) {
    forEachDiagnostic(this.CodeMirror.state, Callback);
  }

  /** ForceLintAsync: Force the editor to lint without rendering. */
  async ForceLintAsync(): Promise<Diagnostic[]> {
    var Diagnostics = [];
    for (var Extension of this.Linters) {
      var Results = await Promise.resolve(
        (Extension as any).Source(this.CodeMirror)
      );
      Diagnostics.push(...Results);
    }
    return Diagnostics;
  }

  /** ForceParse: Force the editor to finish any parsing. */
  ForceParse(SetDirty: boolean = true) {
    forceParsing(this.CodeMirror, this.CodeMirror.state.doc.length, 100000);
    if (SetDirty) this.CodeMirror.state.field(stateExtension).SetDirty();
  }

  /** ForceLint: Force the editor to do another round of linting. */
  ForceLint() {
    // Note that there are 2 linters that are not in this.Linters: runtime/compile
    const plugins: any[] = (this.CodeMirror as any).plugins;
    for (var I = 0; I < plugins.length; I++) {
      if (plugins[I].value.hasOwnProperty('lintTime')) {
        plugins[I].value.set = true;
        plugins[I].value.force();
        break;
      }
    }
  }
  // #endregion

  // #region "Editor Features"
  /** Undo: Make the editor undo. Returns false if no group was available. */
  Undo() {
    undo(this.CodeMirror);
  }

  /** Redo: Make the editor Redo. Returns false if no group was available. */
  Redo() {
    redo(this.CodeMirror);
  }

  /** ClearHistory: Clear the change history. */
  ClearHistory() {
    // Stub!
  }

  /** Find: Find a keyword in the editor and loop over all matches. */
  Find(Keyword: string) {
    openSearchPanel(this.CodeMirror);
    let prevValue = (<HTMLInputElement>(
      this.Parent.querySelector<HTMLElement>('.cm-textfield[name="search"]')
    ))?.value;
    this.CodeMirror.dispatch({
      effects: setSearchQuery.of(
        new SearchQuery({
          search: Keyword,
        })
      ),
    });
    findNext(this.CodeMirror);
    if (!prevValue) prevValue = '';
    this.CodeMirror.dispatch({
      effects: setSearchQuery.of(
        new SearchQuery({
          search: prevValue,
        })
      ),
    });
    closeSearchPanel(this.CodeMirror);
  }

  /** Replace: Loop through the matches and replace one at a time. */
  Replace(Source: string, Target: string) {
    openSearchPanel(this.CodeMirror);
    let prevFind = (<HTMLInputElement>(
      this.Parent.querySelector<HTMLElement>('.cm-textfield[name="search"]')
    ))?.value;
    let prevReplace = (<HTMLInputElement>(
      this.Parent.querySelector<HTMLElement>('.cm-textfield[name="replace"]')
    ))?.value;
    this.CodeMirror.dispatch({
      effects: setSearchQuery.of(
        new SearchQuery({
          search: Source,
          replace: Target,
        })
      ),
    });
    replaceNext(this.CodeMirror);
    if (!prevFind) prevFind = '';
    if (!prevReplace) prevReplace = '';
    findNext(this.CodeMirror);
    this.CodeMirror.dispatch({
      effects: setSearchQuery.of(
        new SearchQuery({
          search: prevFind,
          replace: prevReplace,
        })
      ),
    });
    closeSearchPanel(this.CodeMirror);
  }

  /** FindAll: Find all the matching words in the editor. */
  FindAll(Source: string) {
    openSearchPanel(this.CodeMirror);
    let prevValue = (<HTMLInputElement>(
      this.Parent.querySelector<HTMLElement>('.cm-textfield[name="search"]')
    ))?.value;
    this.CodeMirror.dispatch({
      effects: setSearchQuery.of(
        new SearchQuery({
          search: Source,
        })
      ),
    });
    selectMatches(this.CodeMirror);
    if (!prevValue) prevValue = '';
    this.CodeMirror.dispatch({
      effects: setSearchQuery.of(
        new SearchQuery({
          search: prevValue,
        })
      ),
    });
    closeSearchPanel(this.CodeMirror);
  }

  /** ReplaceAll: Replace the all the matching words in the editor. */
  ReplaceAll(Source: string, Target: string) {
    openSearchPanel(this.CodeMirror);
    let prevFind = (<HTMLInputElement>(
      this.Parent.querySelector<HTMLElement>('.cm-textfield[name="search"]')
    ))?.value;
    let prevReplace = (<HTMLInputElement>(
      this.Parent.querySelector<HTMLElement>('.cm-textfield[name="replace"]')
    ))?.value;
    this.CodeMirror.dispatch({
      effects: setSearchQuery.of(
        new SearchQuery({
          search: Source,
          replace: Target,
        })
      ),
    });
    replaceAll(this.CodeMirror);
    if (!prevFind) prevFind = '';
    if (!prevReplace) prevReplace = '';
    this.CodeMirror.dispatch({
      effects: setSearchQuery.of(
        new SearchQuery({
          search: prevFind,
          replace: prevReplace,
        })
      ),
    });
    closeSearchPanel(this.CodeMirror);
  }

  /** JumpTo: Jump to a certain line. */
  JumpTo(Line: number) {
    const { state } = this.CodeMirror;
    const docLine = state.doc.line(
      Math.max(1, Math.min(state.doc.lines, Line))
    );
    this.CodeMirror.dispatch({
      selection: { anchor: docLine.from },
      scrollIntoView: true,
    });
  }

  /** SelectAll: Select all text in the editor. */
  SelectAll() {
    selectAll(this.CodeMirror);
  }

  /** Select: Select and scroll to a given range in the editor. */
  Select(Start: number, End: number) {
    if (End > this.CodeMirror.state.doc.length || Start < 0 || Start > End) {
      return;
    }
    this.CodeMirror.dispatch({
      selection: { anchor: Start, head: End },
      scrollIntoView: true,
    });
  }

  /** GetSelection: Returns an object of the start and end of
   *  a selection in the editor. */
  GetSelection() {
    return {
      from: this.CodeMirror.state.selection.main.from,
      to: this.CodeMirror.state.selection.main.to,
    };
  }

  /** GetSelectionCode: Returns the selected code in the editor. */
  GetSelectionCode() {
    return this.CodeMirror.state.sliceDoc(
      this.CodeMirror.state.selection.main.from,
      this.CodeMirror.state.selection.main.to
    );
  }
  // #endregion

  // #region "Editor Interfaces"
  /** ShowFind: Show the finding interface. */
  ShowFind() {
    this.HideAllInterfaces();
    openSearchPanel(this.CodeMirror);
    // hide inputs related to replace for find interface
    const input = this.Parent.querySelector<HTMLElement>(
      '.cm-textfield[name="replace"]'
    );
    if (input) input.style.display = 'none';
    const button1 = this.Parent.querySelector<HTMLElement>(
      '.cm-button[name="replace"]'
    );
    if (button1) button1.style.display = 'none';
    const button2 = this.Parent.querySelector<HTMLElement>(
      '.cm-button[name="replaceAll"]'
    );
    if (button2) button2.style.display = 'none';
  }

  /** ShowReplace: Show the replace interface. */
  ShowReplace() {
    this.HideAllInterfaces();
    openSearchPanel(this.CodeMirror);
    // show inputs related to replace
    const input = this.Parent.querySelector<HTMLElement>(
      '.cm-textfield[name="replace"]'
    );
    if (input) input.style.display = 'inline-block';
    const button1 = this.Parent.querySelector<HTMLElement>(
      '.cm-button[name="replace"]'
    );
    if (button1) button1.style.display = 'inline-block';
    const button2 = this.Parent.querySelector<HTMLElement>(
      '.cm-button[name="replaceAll"]'
    );
    if (button2) button2.style.display = 'inline-block';
  }

  /** ShowJumpTo: Show the jump-to-line interface. */
  ShowJumpTo() {
    closeSearchPanel(this.CodeMirror);
    const jumpElm = this.Parent.querySelector<HTMLElement>('.cm-gotoLine');
    jumpElm ? (jumpElm.style.display = 'flex') : gotoLine(this.CodeMirror);
  }

  /** HideJumpTo: Hide line interface. */
  HideJumpTo() {
    const jumpElm = this.Parent.querySelector<HTMLElement>('.cm-gotoLine');
    if (jumpElm) jumpElm.style.display = 'none';
  }

  /** HideAllInterfaces: Hide all interfaces available. */
  HideAllInterfaces() {
    closeSearchPanel(this.CodeMirror);
    this.HideJumpTo();
  }

  /** ShowProcedures: Show a list of procedures for the user to jump to. */
  ShowProcedures() {
    // Stub!
  }
  // #endregion

  // #region "Event Handling"
  /** onUpdate: Handle the Update event. */
  private onUpdate(update: ViewUpdate) {
    if (this.Options.OnUpdate != null) {
      this.Options.OnUpdate(update.docChanged, update);
    }
    if (update.focusChanged) {
      if (this.CodeMirror.hasFocus) {
        if (this.Options.OnFocused != null)
          this.Options.OnFocused(this.CodeMirror);
      } else {
        if (this.Options.OnBlurred != null)
          this.Options.OnBlurred(this.CodeMirror);
      }
    }
  }
  // #endregion
}

/** Export classes globally. */
const Localized = new LocalizationManager();
try {
  (window as any).GalapagosEditor = GalapagosEditor;
  (window as any).EditorLocalized = Localized;
} catch (error) {}
export { Localized };
