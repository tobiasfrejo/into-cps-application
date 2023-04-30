import { GitConnector } from "./git-connector";

class Trace {
    subject: string
    predicate: string
    object: string

    constructor (subject: string, predicate: string, object: string) {
        this.subject = subject;
        this.predicate = predicate;
        this.object = object;
    }
}

class TrNode {
    uri: string
    specifier: string

    constructor (uri: string) {
        this.uri = uri
    }

    getParameters() {
        let p: {[key: string]: string} = {}
        return p
    }
}

class Agent extends TrNode {
    name: string
    email: string
    constructor (uri: string, name: string=undefined, email: string=undefined) {
        super(uri)
        this.specifier = "prov:Agent"
        this.name = name
        this.email = email
    }

    fromGit() {
        let gc = new GitConnector()
        let u = gc.getUserData()
        this.name = u.username
        this.email = u.email
    }

    getParameters() {
        return {
            ...super.getParameters(),
            "name": this.name,
            "email": this.email
        }
    }
}

class Activity extends TrNode {
    type: string
    time: Date
    constructor (uri: string, type: string, time: Date) {
        super(uri)
        this.specifier = "prov:Activity"
        this.type = type
        this.time = time
    }

    getParameters() {
        return {
            ...super.getParameters(),
            "type": this.type,
            "time": this.time.toISOString()
        }
    }
}

class Entity extends TrNode {
    type: string
    constructor (uri: string, type: string) {
        super(uri)
        this.specifier = "prov:Entity"
        this.type = type
    }

    getParameters() {
        return {
            ...super.getParameters(),
            "type": this.type,
        }
    }
}

class Artefact extends Entity {
    path: string
    hash: string

    constructor (uri: string, type: string, path: string, hash: string) {
        super(uri, type)
        this.path = path
        this.hash = hash
    }

    getParameters() {
        return {
            ...super.getParameters(),
            "path": this.path,
            "hash": this.hash,
        }
    }
}

class Tool extends Entity {
    name: string
    version: string

    constructor(uri:string, type:string, name:string, version:string) {
        super(uri, type)
        this.name = name
        this.version = version
    }

    getParameters() {
        return {
            ...super.getParameters(),
            "name": this.name,
            "intocps:version": this.version,
        }
    }
}

export {Trace, TrNode, Activity, Agent, Entity, Artefact, Tool}