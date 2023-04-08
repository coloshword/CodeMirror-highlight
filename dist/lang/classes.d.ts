/** Primitive: Static metadata of a single NetLogo primitive. */
export interface Primitive {
    /** Extension: Where the primitive belongs to. */
    Extension: string;
    /** Name: Name of the primitive. */
    Name: string;
    /** LeftArgumentType: Type of the argument to the left of the primitive. */
    LeftArgumentType: Argument | null;
    /** RightArgumentTypes: Type of the argument to the right of the primitive. */
    RightArgumentTypes: Argument[];
    /** ReturnType: Return type of the primitive. */
    ReturnType: Argument;
    /** Precedence: Precedence of the primitive. */
    Precedence: number;
    /** AgentContext: Acceptable context for the primitive. */
    AgentContext: AgentContexts;
    /** BlockContext: Context in the command block of the primitive. */
    BlockContext?: AgentContexts;
    /** DefaultOption: Default number of arguments. */
    DefaultOption?: number;
    /** MinimumOption: Minimum number of arguments. */
    MinimumOption?: number;
    /** IsRightAssociative: Unsure what this is for. */
    IsRightAssociative?: boolean;
    /** IntroducesContext: If this primitive introduces a new context. */
    IntroducesContext?: boolean;
    /** CanBeConcise: Unsure what this is for. */
    CanBeConcise?: boolean;
    InheritParentContext?: boolean;
}
/** Argument: Static metadata of a NetLogo primitive's argument. */
export interface Argument {
    Types: NetLogoType[];
    CanRepeat: boolean;
    Optional: boolean;
}
/** NetLogoType: Types that are available in NetLogo. */
export declare enum NetLogoType {
    Unit = 0,
    Wildcard = 1,
    String = 2,
    Number = 3,
    List = 4,
    Boolean = 5,
    Agent = 6,
    AgentSet = 7,
    Nobody = 8,
    Turtle = 9,
    Patch = 10,
    Link = 11,
    CommandBlock = 12,
    CodeBlock = 13,
    NumberBlock = 14,
    Reporter = 15,
    Symbol = 16,
    LinkSet = 17,
    ReporterBlock = 18,
    BooleanBlock = 19,
    Command = 20,
    Other = 21
}
/** BreedLocation: Possible locations of breed name in primitives. */
export declare enum BreedLocation {
    First = 0,
    Second = 1,
    Third = 2,
    Middle = 3,
    Question = 4,
    Null = 5
}
/** AgentContexts: Agent contexts of a primitive. */
export declare class AgentContexts {
    Observer: boolean;
    Turtle: boolean;
    Patch: boolean;
    Link: boolean;
    /** Parse an agent-context string. */
    constructor(Input?: string);
}
/** Breed: Dynamic metadata of a single breed. */
export declare class Breed {
    /** Singular: The singular name of the breed. */
    Singular: string;
    /** Plural: The plural name of the breed. */
    Plural: string;
    /** Variables: Variables defined for the breed. */
    Variables: string[];
    /** isLinkBreed: Whether the breed is a link breed (the alternative being a turtle breed). */
    isLinkBreed: boolean;
    /** EditorId: which editor created the breed (for LinkContext). */
    EditorId?: number;
    /** Build a breed. */
    constructor(Singular: string, Plural: string, Variables: string[], isLinkBreed: boolean);
}
/** Procedure: Dynamic metadata of a procedure. */
export declare class Procedure {
    /** name: The name of the procedure. */
    Name: string;
    /** Arguments: The arguments of the procedure. */
    Arguments: string[];
    /** Variables: local variables defined for the procedure. */
    Variables: LocalVariable[];
    /** AnonymousProcedures: anonymous procedures defined for the procedure. */
    AnonymousProcedures: Procedure[];
    /** PositionStart: The starting position of the procedure in the document. */
    PositionStart: number;
    /** PositionEnd: The end position of the procedure in the document. */
    PositionEnd: number;
    /** IsCommand: Is the procedure a command (to) instead of a reporter (to-report)? */
    IsCommand: boolean;
    /** IsCommand: Is the procedure anonymous? */
    IsAnonymous: boolean;
    /** Context: The possible contexts for the procedure */
    Context: AgentContexts;
    /** CodeBlocks: code blocks within the procedure. */
    CodeBlocks: CodeBlock[];
    /** EditorId: which editor created the procedure (for LinkContext). */
    EditorId?: number;
    /** isProcedure: used for linting; whether is a procedure or codeblock. */
    isProcedure: boolean;
}
export declare class CodeBlock {
    /** PositionStart: The position at the start of the code block. */
    PositionStart: number;
    /** PositionEnd: The position at the end of the code block. */
    PositionEnd: number;
    /** Context: The possible contexts for the code block */
    Context: AgentContexts;
    /** CodeBlocks: code blocks within the code block. */
    CodeBlocks: CodeBlock[];
    /** Variables: local variables defined for the code block. */
    Variables: LocalVariable[];
    /** Arguments: The arguments accessible within the code block. */
    Arguments: string[];
    /** AnonymousProcedures: anonymous procedures defined within the code block. */
    AnonymousProcedures: Procedure[];
    /** isProcedure: used for linting; whether is a procedure or codeblock. */
    isProcedure: boolean;
    /** Primitive: the primitive that created the codeblock. */
    Primitive: string;
    /** Breed: the breed in the primitive that created the codeblock (if present). */
    Breed: string | null;
    /** InheritParentContext: whether context needs to match parent context. */
    InheritParentContext: boolean;
}
/** Procedure: Dynamic metadata of an anonymous procedure. */
export declare class AnonymousProcedure {
    /** PositionStart: The position at the start of the procedure. */
    PositionStart: number;
    /** PositionEnd: The position at the end of the procedure. */
    PositionEnd: number;
    /** Arguments: The arguments of the procedure. */
    Arguments: string[];
    /** Variables: local variables defined for the procedure. */
    Variables: LocalVariable[];
}
/** LocalVariable: metadata for local variables */
export declare class LocalVariable {
    /** Name: The name of the variable. */
    Name: string;
    /** Type: The type of the variable. */
    Type: NetLogoType;
    /** CreationPos: The position where the variable was created. */
    CreationPos: number;
    /** Build a local variable. */
    constructor(Name: string, Type: NetLogoType, CreationPos: number);
}
/** PreprocessContext: master context from preprocessing */
export declare class PreprocessContext {
    /** PluralBreeds: Breeds in the model. */
    PluralBreeds: Map<string, number>;
    /** SingularBreeds: Breeds in the model. */
    SingularBreeds: Map<string, number>;
    /** BreedVars: Breed variables in the model. */
    BreedVars: Map<string, number>;
    /** Commands: Commands in the model with number of arguments. */
    Commands: Record<string, number>;
    /** Reporters: Reporters in the model with number of arguments. */
    Reporters: Record<string, number>;
    /** Commands: Commands in the model with editor id. */
    CommandsOrigin: Record<string, number>;
    /** Reporters: Reporters in the model with editor id. */
    ReportersOrigin: Record<string, number>;
}
/** LintPreprocessContext: master context from statenetlogo */
export declare class LintContext {
    /** Extensions: Extensions in the code. */
    Extensions: Map<string, number>;
    /** Globals: Globals in the code. */
    Globals: Map<string, number>;
    /** WidgetGlobals: Globals from the widgets. */
    WidgetGlobals: Map<string, number>;
    /** Breeds: Breeds in the code. */
    Breeds: Map<string, Breed>;
    /** Procedures: Procedures in the code. */
    Procedures: Map<string, Procedure>;
    /** GetBreedNames: Get names related to breeds. */
    GetBreedNames(): string[];
    /** GetBreedVariables: Get variable names related to breeds. */
    GetBreedVariables(): string[];
}
