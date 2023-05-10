import {NgModule} from "@angular/core";
import { TraceabilityPageComponent } from "./traceability-page.component";
import { TrSimulationComponent } from "./tr-sim.component";
import { SharedModule } from "../shared/shared.module";
import { BrowserModule } from "@angular/platform-browser";
import { HttpClientModule } from "@angular/common/http";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { MmModule } from "../mm/mm.module";
import { COEModule } from "../coe/coe.module";

@NgModule({
    imports: [BrowserModule, SharedModule],
    declarations: [TraceabilityPageComponent, TrSimulationComponent],
    exports: [TraceabilityPageComponent]
})
export class TraceabilityModule {
    constructor() {
        console.log("Traceability Module")
    }
}