import { Component, Input, OnInit } from "@angular/core";
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
export class TrSimulationComponent implements OnInit {
    @Input() 
    node: Activity;

    //result: Array<TrNode>
    loading: Boolean
    TrController: TraceabilityController

    fmus: Array<Artefact>
    mm_artefact: Artefact
    sim_artefact: Artefact
    engine: Tool
    agent: Agent
    result_artefact: Artefact

    constructor () {
        //this.result = []
        this.loading = true
        this.TrController = IntoCpsApp.getInstance().trController

        console.log("Constructed sim component: " + this.node)
    }

    public ngOnInit(): void {
        console.log("OnInit sim component: " + JSON.stringify(this.node))
        this.getSimTraces()
        .finally(() => {
            this.loading = false
        })
    }

    getSimTraces() {
        if (this.TrController.client)
            return this.TrController.client.getSimulationDetails(this.node.uri)
            .then(res => {
                console.log("Received", JSON.stringify(res, null, 2))

                this.fmus = res.fmus;
                this.mm_artefact = res.mmConfig;
                this.sim_artefact = res.simulationConfig;
                this.engine = res.engine;
                this.agent = res.agent;
                this.result_artefact = res.result;
            })
    }

    openModel() {
        IntoCpsAppMenuHandler.getInstance().openMultiModel(
            path.resolve(
                IntoCpsApp.getInstance().activeProject.getRootFilePath(),
                this.mm_artefact.path
            )
        )
    }

    openSim() {
        IntoCpsAppMenuHandler.getInstance().openCoeView(
            path.resolve(
                IntoCpsApp.getInstance().activeProject.getRootFilePath(),
                this.sim_artefact.path
            )
        )
    }
}
