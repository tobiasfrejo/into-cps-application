import { GitConnector } from "./git-connector";
import IntoCpsApp from "../IntoCpsApp";
import { assert } from "console";
import { ActivityType, ArtefactType, EntityType, IntocpsPredicate, Prov, ToolType } from "./TraceabilityKeys";
import { v5 as UUIDv5 } from 'uuid'

function getUrnUuid(name:string) {
    const ns = UUIDv5("into-cps.org", UUIDv5.DNS)
    return "urn:uuid:" + UUIDv5(name, ns)
}

export function getActiveProjectUri() {
    return "urn:uuid:" + IntoCpsApp.getInstance().activeProject.getId()
}

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

    constructor () {
        this.className = "TrNode"
    }

    load(uri:string, parameters:{[key: string]: string}) {
        if ('type' in parameters) {
            switch (parameters['type']) {
                case Prov.AGENT:
                    return new Agent().load(uri, parameters)

                case Prov.ACTIVITY:
                    return new Activity().load(uri, parameters)

                case Prov.ENTITY:
                    if (!(IntocpsPredicate.ENTITYTYPE in parameters)) {
                        console.error("Improper Entity: " + uri)
                        console.debug(JSON.stringify(parameters, null, 2))
                    }

                    else if (parameters[IntocpsPredicate.ENTITYTYPE] === EntityType.TOOL)
                        return new Tool().load(uri, parameters)

                    else if (parameters[IntocpsPredicate.ENTITYTYPE] === EntityType.ARTEFACT)
                        return new Artefact().load(uri, parameters)
                    
                    break;

                default:
                    break;
            }
        }


        this.uri = uri
        return this
    }

    getParameters() {
        let p: {[key: string]: string} = {}
        return p
    }
}

class Agent extends TrNode {
    name: string
    email: string
    constructor () {
        super()
        this.className = "Agent"
        this.specifier = Prov.AGENT
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
        this.specifier = Prov.ACTIVITY
    }

    load(uri:string, parameters:{[key:string]:string}) {
        this.uri = uri
        this.type = parameters[IntocpsPredicate.ACTIVITYTYPE]
        this.time = new Date(parameters['time'])
        
        return this
    }

    setParameters(type:string, time:Date) {
        this.type = type
        this.time = time

        this.uri = getUrnUuid(`Activity.${type}#${time.toISOString()}`)

        return this
    }

    getParameters() {
        return {
            ...super.getParameters(),
            "type": this.type,
            "time": this.time.toISOString()
        }
    }

    mmConfigCreation(date:Date = null) {
        return this.setParameters(
            ActivityType.MMCREATE,
            date ? date : new Date()
        )
    }

    coSimConfigCreation(date:Date=null) {
        return this.setParameters(
            ActivityType.SIMCREATE,
            date ? date : new Date()
        )
    }

    simulation(date:Date=null) {
        return this.setParameters(
            ActivityType.SIMULATION,
            date ? date : new Date()
        )
    }
}

class Entity extends TrNode {
    type: string
    constructor () {
        super()
        this.className = "Entity"
        this.specifier = Prov.ENTITY
    }

    load(uri:string, parameters:{[key:string]:string}) {
        this.uri = uri
        this.type = parameters[IntocpsPredicate.ENTITYTYPE]
        
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
        this.type = parameters[IntocpsPredicate.ARTEFACTTYPE]
        this.path = parameters['path']
        this.hash = parameters['hash']
        
        return this
    }

    setParameters(type:string, path: string, hash: string) {
        this.type = type
        this.path = path
        this.hash = hash

        this.uri = getUrnUuid(`Artefact.${type}#${hash}`)

        return this
    }

    getParameters() {
        return {
            ...super.getParameters(),
            "path": this.path,
            "hash": this.hash,
        }
    }

    fmu(path:string) {
        return this.setParameters(
            ArtefactType.FMU,
            path,
            GitConnector.getFileHash(path)
        )
    }

    mmConfig(path:string, hash:string=null) {
        return this.setParameters(
            ArtefactType.MMCONFIG,
            path,
            hash? hash : GitConnector.getFileHash(path)
        )
    }

    coSimConfig(path:string, hash:string=null) {
        return this.setParameters(
            ArtefactType.SIMCONFIG,
            path,
            hash? hash : GitConnector.getFileHash(path)
        )
    }

    result(path:string) {
        return this.setParameters(
            ArtefactType.SIMRESULT,
            path,
            GitConnector.getFileHash(path)
        )
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
        this.type = parameters[IntocpsPredicate.TOOLTYPE]
        this.name = parameters['name']
        this.version = parameters['version']
        
        return this
    }

    setParameters(type:string, name: string, version: string) {
        this.type = type
        this.name = name
        this.version = version

        this.uri = getUrnUuid(`Tool.${type}#${name} ${version}`)

        return this
    }

    getParameters() {
        return {
            ...super.getParameters(),
            "name": this.name,
            "intocps:version": this.version,
        }
    }

    intoCpsApp() {
        if (IntoCpsApp.getInstance().app.getName() == "Electron")
            return this.setParameters(
                ToolType.SOFTWARE,
                "INTO-CPS Application",
                "dev-build"
            )
        else 
            return this.setParameters(
                ToolType.SOFTWARE,
                IntoCpsApp.getInstance().app.getName(),
                IntoCpsApp.getInstance().app.getVersion()
            )
                
    }
}

export {Trace, TrNode, Activity, Agent, Entity, Artefact, Tool}