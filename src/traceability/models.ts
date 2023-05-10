import { GitConnector } from "./git-connector";
import IntoCpsApp from "../IntoCpsApp";

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
    className: string

    uri: string
    specifier: string
    projectId: string

    constructor (uri: string) {
        this.className = "TrNode"
        this.uri = uri
    }

    setProjectId(id: string = null) {
        if (id === null)
            this.projectId = IntoCpsApp.getInstance().activeProject.getId()
        else
            this.projectId = id
    }

    getParameters() {
        let p: {[key: string]: string} = {
            projectId: this.projectId
        }
        return p
    }
}

class Agent extends TrNode {
    name: string
    email: string
    constructor (uri: string, name: string=undefined, email: string=undefined) {
        super(uri)
        this.className = "Agent"
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
        this.className = "Activity"
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
        this.className = "Entity"
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
        this.className = "Artefact"
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
        this.className = "Tool"
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