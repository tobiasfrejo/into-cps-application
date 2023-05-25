import * as jsonld from 'jsonld';
import { TrNode, Trace } from "./models";
import { prefixes, terms } from './contextHelper';

const default_document: jsonld.JsonLdDocument = 
{
    "@context": {
        ...prefixes,
        ...terms
    }
}


export class JsonLdBuilder {
    graph: Array<jsonld.ValueObject | jsonld.NodeObject> = []

    addNode(node: TrNode) {
        let n: jsonld.NodeObject = {
            "@id": node.uri,
            "@type": node.specifier,
            ...node.getParameters()
        }
        this.graph.push(n)
    }

    addTrace(trace: Trace) {
        let n: jsonld.NodeObject = {
            "@id": trace.subject,
            [trace.predicate]: trace.object
        }
        this.graph.push(n)
    }

    getDocument(): jsonld.JsonLdDocument {
        return {
            ...default_document,
            "@graph": this.graph
        }
    }

    stringify() {
        return JSON.stringify(this.getDocument())
    }
}