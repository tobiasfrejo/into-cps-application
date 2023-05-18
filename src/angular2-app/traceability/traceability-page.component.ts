import { Component } from "@angular/core";
import IntoCpsApp from "../../IntoCpsApp";
import { Activity, Artefact, TrNode, Trace } from "../../traceability/models";
import { TraceabilityController } from "../../traceability/TraceabilityController";
import { GitConnector } from "../../traceability/git-connector";
import { TraceMessageBuilder } from "../../traceability/TraceMessageBuilder";

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
        if (!this.TrController.enabled) return
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
        if (!this.TrController.enabled) return
        this.loading = true
        this.TrController.client.sendGet('nodes')
        .then((rd: Object) => {
            if ('nodes' in rd)
                this.nodes = Object.values(rd['nodes'])
            this.loading = false
        })
    }


    testPost = () => {
        let builder = new TraceMessageBuilder()
        builder.addProjectNode()

        let now = new Date();

        let id1 = now.getMilliseconds() * 1234
        let id2 = now.getMilliseconds() * 4321

        let a1 = new Artefact().setParameters(
            "intocps:fmu",
            "fmus/test1.zip",
            id1.toString()
        )
        let a2 = new Artefact().setParameters(
            "intocps:fmu",
            "fmus/test2.zip",
            id2.toString()
        )
        let sim = new Activity().setParameters(
            "intocps:Simulation",
            now
        )

        builder.addNode(a1)
        builder.addNode(a2)
        builder.addNode(sim)
        builder.addTrace(
            new Trace(
                sim.uri,
                "prov:used",
                a1.uri
        ))
        builder.addTrace(
            new Trace(
                sim.uri,
                "prov:used",
                a2.uri
        ))
        
        this.TrController.client.push(builder)
    }

}
