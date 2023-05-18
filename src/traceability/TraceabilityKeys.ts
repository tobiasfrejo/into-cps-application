export namespace IntocpsPredicate {
    export const INPROJECT          = "intocps:inProject";
    export const ENTITYTYPE         = "intocps:EntityType";
    export const ACTIVITYTYPE       = "intocps:ActivityType";
    export const ARTEFACTTYPE       = "intocps:ArtefactType";
    export const TOOLTYPE           = "intocps:ToolType";
}

export namespace Prov {
    export const USED               = "prov:used";
    export const WASGENERATEDBY     = "prov:wasGeneratedBy";
    export const WASASSOCIATEDWITH  = "prov:wasAssociatedWith";
    export const WASATTRIBUTEDTO    = "prov:wasAttributedTo";
    export const WASDERIVEDFROM     = "prov:wasDerivedFrom"; 
    export const ENTITY             = "prov:Entity";
    export const ACTIVITY           = "prov:Activity";
    export const AGENT              = "prov:Agent";
}

export namespace EntityType {
    export const ARTEFACT           = "intocps:Artefact";
    export const TOOL               = "intocps:Tool";
    export const PROJECT            = "intocps:Project";
}
export namespace ActivityType {
    export const MMCREATE           = "intocps:modelCreation";
    export const SIMCREATE          = "intocps:simulationConfigurationCreation";
    export const SIMULATION         = "intocps:simulation";
}
export namespace ArtefactType {
    export const FMU                = "intocps:fmu";
    export const MMCONFIG           = "intocps:multiModelConfiguration";
    export const SIMCONFIG          = "intocps:simulationConfiguration";
    export const SIMRESULT          = "intocps:simulationResult";
}
export namespace ToolType {
    export const SOFTWARE           = "intocps:softwareTool";
    export const COE                = "intocps:coSimulationEngine";
}
