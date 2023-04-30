import {ViewController} from "../../iViewController";
import IntoCpsApp from "../../IntoCpsApp";
import {AppComponent} from "../app.component";
import * as Path from 'path';

interface MyWindow extends Window {
    ng2app: AppComponent;
}

declare var window: MyWindow;

export class TraceabilityViewController extends ViewController {
    constructor(private view: HTMLDivElement) {
        super(view);
    }

    initialize() {
        $(this.view).css('height',0);
        IntoCpsApp.setTopName("Traceability");
        window.ng2app.openTraceability();
    }

    deInitialize() {
        if (window.ng2app.navigationService.canNavigate()) {
            window.ng2app.closeAll();
            $(this.view).css('height',"calc(100% - 80px)");
            return true;
        }
        return false;
    }
}