import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import IntoCpsApp from "../../IntoCpsApp";
import { Activity, Agent, Artefact, Tool, TrNode, Trace } from "../../traceability/models";
import { TraceabilityController } from "../../traceability/TraceabilityController";
import { ArtefactType } from "../../traceability/TraceabilityKeys";
import { IntoCpsAppMenuHandler } from "../../IntoCpsAppMenuHandler";
import * as path from 'path'

@Component({
    selector: "tr-sim",
    templateUrl: './angular2-app/traceability/tr-sim.component.html'
})
export class TrSimulationComponent {
    @Input() 
    node: {
        fmus: Array<Artefact>
        mmConfig: Artefact
        simulationConfig: Artefact
        engine: Tool
        agent: Agent
        result: Artefact
        simulationActivity: Activity
    };

    @Output() simulationsWithFmu = new EventEmitter<string>();

    openModel() {
        IntoCpsAppMenuHandler.getInstance().openMultiModel(
            path.resolve(
                IntoCpsApp.getInstance().activeProject.getRootFilePath(),
                this.node.mmConfig.path
            )
        )
    }

    openSim() {
        IntoCpsAppMenuHandler.getInstance().openCoeView(
            path.resolve(
                IntoCpsApp.getInstance().activeProject.getRootFilePath(),
                this.node.simulationConfig.path
            )
        )
    }

    listSimulationsWithFmu(uri:string) {
        this.simulationsWithFmu.emit(uri)
    }
}
