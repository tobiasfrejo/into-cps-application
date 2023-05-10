import { Component, Input } from "@angular/core";
import IntoCpsApp from "../../IntoCpsApp";
import { Activity, TrNode, Trace } from "../../traceability/models";
import { TraceabilityController } from "../../traceability/TraceabilityController";

@Component({
    selector: "tr-sim",
    templateUrl: './angular2-app/traceability/tr-sim.component.html'
})
export class TrSimulationComponent {
    @Input() 
    node: Activity;

    result: Array<TrNode>
    loading: Boolean
    TrController: TraceabilityController

    constructor () {
        this.result = []
        this.loading = false
        this.TrController = IntoCpsApp.getInstance().trController
    
        console.log("Initialized sim component: " + this.node)
    }

    getFmus() {
        this.loading = true
        this.TrController.client.getFmusInSimulation(this.node.uri)
        .then((rd: {nodes: Array<TrNode>, traces: Array<Trace>}) => {
            let used: Array<string> = []

            this.result = []

            // Get all "used" traces
            rd.traces.forEach(tr => {
                console.log(tr)
                if (!used.includes(tr.object) && tr.predicate == "prov:used") used.push(tr.object)
            })

            // Get the FMU nodes with a used trace to it
            rd.nodes.forEach(nd => {
                if (used.includes(nd.uri)) this.result.push(nd)
            })
        })
        .finally(() => {
            this.loading = false
        })
    }
}
