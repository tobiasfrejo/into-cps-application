import { GitConnector } from "./git-connector";
import IntoCpsApp from "../IntoCpsApp";
import { assert } from "console";

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

    constructor () {
        this.className = "TrNode"
    }

    load(uri:string, parameters:{[key: string]: string}) {
        if ('type' in parameters) {
            switch (parameters['type']) {
                case 'prov:Agent':
                    return new Agent().load(uri, parameters)

                case 'prov:Activity':
                    return new Activity().load(uri, parameters)

                case 'prov:Entity':
                    if (!('intocps:EntityType' in parameters)) {
                        console.error("Improper Entity: " + uri)
                        console.debug(JSON.stringify(parameters, null, 2))
                    }

                    else if (parameters['intocps:EntityType'] === 'intocps:Tool')
                        return new Tool().load(uri, parameters)

                    else if (parameters['intocps:EntityType'] === 'intocps:Artefact')
                        return new Artefact().load(uri, parameters)
                    
                    break;

                default:
                    break;
            }
        }


        this.uri = uri
        return this
    }

    setProjectId(id: string = null) {
        if (id === null)
            this.projectId = IntoCpsApp.getInstance().activeProject.getId()
        else
            this.projectId = id
        
        return this
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
    constructor () {
        super()
        this.className = "Agent"
        this.specifier = "prov:Agent"
    }

    load(uri:string, parameters:{[key:string]:string}) {
        assert(uri == "mailto:"+parameters['email'])

        this.uri = uri
        this.name = parameters['name']
        this.email = parameters['email']

        return this
    }

    setParameters(name: string, email: string) {
        this.uri = "mailto:" + email
        this.name = name
        this.email = email
        return this
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
    constructor () {
        super()
        this.className = "Activity"
        this.specifier = "prov:Activity"
    }

    load(uri:string, parameters:{[key:string]:string}) {
        this.uri = uri
        this.type = parameters['type']
        this.time = new Date(parameters['time'])
        
        return this
    }

    setParameters(type:string, time:Date) {
        this.type = type
        this.time = time

        this.uri = `intocps:Activity.${type}.${time.toISOString()}`

        return this
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
    constructor () {
        super()
        this.className = "Entity"
        this.specifier = "prov:Entity"
    }

    load(uri:string, parameters:{[key:string]:string}) {
        this.uri = uri
        this.type = parameters['type']
        
        return this
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

    constructor () {
        super()
        this.className = "Artefact"
    }

    load(uri:string, parameters:{[key:string]:string}) {
        this.uri = uri
        this.type = parameters['type']
        this.path = parameters['path']
        this.hash = parameters['hash']
        
        return this
    }

    setParameters(type:string, path: string, hash: string) {
        this.type = type
        this.path = path
        this.hash = hash

        this.uri = `intocps:Entity.${type}.${hash}`

        return this
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

    constructor() {
        super()
        this.className = "Tool"
    }

    load(uri:string, parameters:{[key:string]:string}) {
        this.uri = uri
        this.type = parameters['type']
        this.name = parameters['name']
        this.version = parameters['version']
        
        return this
    }

    setParameters(type:string, name: string, version: string) {
        this.type = type
        this.name = name
        this.version = version

        this.uri = `intocps:Entity.${type}.${name} ${version}`

        return this
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