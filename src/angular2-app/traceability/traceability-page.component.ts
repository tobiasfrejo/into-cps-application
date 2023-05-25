import { Component, OnInit } from "@angular/core";
import IntoCpsApp from "../../IntoCpsApp";
import { Activity, Agent, Artefact, Tool, TrNode, Trace } from "../../traceability/models";
import { TraceabilityController } from "../../traceability/TraceabilityController";
import { GitConnector } from "../../traceability/git-connector";
import { TraceMessageBuilder } from "../../traceability/TraceMessageBuilder";

@Component({
    selector: "tr-page",
    templateUrl: './angular2-app/traceability/traceability-page.component.html'
})
export class TraceabilityPageComponent implements OnInit {
    simulations: Array<{
        fmus: Array<Artefact>
        mmConfig: Artefact
        simulationConfig: Artefact
        engine: Tool
        agent: Agent
        result: Artefact
        simulationActivity: Activity
    }>
    loading: Boolean
    TrController: TraceabilityController

    constructor () {
        this.simulations = []
        this.loading = false
        this.TrController = IntoCpsApp.getInstance().trController
    }

    public ngOnInit(): void {
        this.getSimulations()
    }

    getSimulations() {
        if (!this.TrController.enabled) return
        
        this.loading = true
        this.simulations = []
        return this.TrController.client.getSimulations()
        .then((sims: Array<Activity>) => {
            for (let sim of sims) {
                this.TrController.client.getSimulationDetails(sim.uri)
                .then(res => {
                    this.simulations.push({...res, simulationActivity: sim})
                })
            }
        })
        .finally(() => {
            this.loading = false
        })
    }

    getSimulationsWithFmu(uri:string) {
        if (!this.TrController.enabled) return

        this.loading = true
        this.simulations = []
        return this.TrController.client.getSimulationsWithFmu(uri)
        .then((sims: Array<Activity>) => {
            for (let sim of sims) {
                this.TrController.client.getSimulationDetails(sim.uri)
                .then(res => {
                    this.simulations.push({...res, simulationActivity: sim})
                })
            }
        })
        .finally(() => {
            this.loading = false
        })
    }
}
