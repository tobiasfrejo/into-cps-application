import { Component } from "@angular/core";
import IntoCpsApp from "../../IntoCpsApp";
import { Activity, Artefact, TrNode, Trace } from "../../traceability/models";
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

    getSimulations() {
        console.log("Testing...")
        this.loading = true
        this.TrController.client.getSimulations()
        .then((rd: Object) => {
            if ('nodes' in rd)
                this.nodes = Object.values(rd['nodes'])
        })
        .finally(() => {
            this.loading = false
        })

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


    testPost = () => {
        let now = new Date();

        let sim = new Activity(
            "intopcs:Simulation." + now.toISOString(),
            "intocps:Simulation",
            now
        )

        let id1 = now.getMilliseconds() * 1234
        let id2 = now.getMilliseconds() * 4321

        let mod1 = new Artefact(
            "intocps:fmu.testmodel_a." + id1,
            "intocps:fmu",
            "fmus/test1.zip",
            id1.toString()
        )

        let mod2 = new Artefact(
            "intocps:fmu.testmodel_b." + id2,
            "intocps:fmu",
            "fmus/test2.zip",
            id2.toString()
        )

        let tr1 = new Trace(
            "intopcs:Simulation." + now.toISOString(),
            "prov:used",
            "intocps:fmu.testmodel_a." + id1
        )

        let tr2 = new Trace(
            "intopcs:Simulation." + now.toISOString(),
            "prov:used",
            "intocps:fmu.testmodel_b." + id2
        )

        this.TrController.client.post(
            [sim, mod1, mod2],
            [tr1, tr2]
        )
    }

}
