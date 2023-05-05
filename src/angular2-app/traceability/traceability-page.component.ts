import { Component } from "@angular/core";
import IntoCpsApp from "../../IntoCpsApp";
import { TrNode } from "../../traceability/models";
import { TraceabilityController } from "../../traceability/TraceabilityController";

@Component({
    selector: "tr-page",
    templateUrl: './angular2-app/traceability/traceability-page.component.html'
})
export class TraceabilityPageComponent {
    nodes: Array<TrNode>
    loading: Boolean
    TrController: TraceabilityController

    constructor () {
        this.nodes = []
        this.loading = false
        this.TrController = IntoCpsApp.getInstance().trController
    }

    getNodes = () => {
        this.loading = true
        this.TrController.client.sendGet('nodes')
        .then((rd: Object) => {
            if ('nodes' in rd)
                this.nodes = Object.values(rd['nodes'])
            this.loading = false
        })
    }
}
