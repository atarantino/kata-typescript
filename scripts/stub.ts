import dsaCatalog, {
    type ClassSpec,
    type DsaSpec,
    type FunctionSpec,
    type GetterSpec,
    type MethodSpec,
    type PropertySpec,
} from "./dsa";

function generateMethod(method: MethodSpec): string {
    return `${method.name}(${method.args || ""}): ${method.return || "void"} {

}`;
}

function generateProperty(property: PropertySpec): string {
    return `${property.scope} ${property.name}: ${property.type};`;
}

function generateGetter(getter: GetterSpec): string {
    return `get ${getter.name}(): ${getter.return} {
    return this.${getter.prop_name};
}`;
}

function renderClass(name: string, item: ClassSpec): string {
    return `export default class ${name}${item.generic || ""} {
    ${(item.properties || []).map(generateProperty).join("\n    ")}

    ${(item.getters || []).map(generateGetter).join("\n    ")}

    constructor() {
    }

    ${(item.methods || []).map(generateMethod).join("\n    ")}
}`;
}

function renderFunction(item: FunctionSpec): string {
    const generic = item.generic ? item.generic : "";
    return `export default function ${item.fn}${generic}(${item.args}): ${item.return} {

}`;
}

export function renderStub(name: string, item: DsaSpec): string {
    return item.type === "class"
        ? renderClass(name, item)
        : renderFunction(item);
}

/**
 * True when a day file is still the generated stub — nothing was attempted.
 * Compared without whitespace so a `npm run prettier` pass doesn't make an
 * untouched stub look like work.
 */
export function isUntouchedStub(name: string, contents: string): boolean {
    const spec = (dsaCatalog as Record<string, DsaSpec | undefined>)[name];

    if (spec === undefined) {
        return false;
    }

    return squash(contents) === squash(renderStub(name, spec));
}

function squash(contents: string): string {
    return contents.replace(/\s+/g, "");
}
