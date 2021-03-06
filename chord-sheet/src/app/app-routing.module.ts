import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import {LoginSignupComponent} from "./components/login-signup/login-signup.component";
import {PrivacyComponent} from "./components/privacy/privacy.component";
import {EditScreenComponent} from "./components/edit-screen/edit-screen.component";
import {MainScreenComponent} from "./components/main-screen/main-screen.component";
import {NotFoundComponent} from "./components/not-found/not-found.component";
import {RouteGuardService} from "./services/guards/route-guard/route-guard.service";
import {ChordsheetService} from "./services/chordsheet/chordsheet.service";
import {ViewChordsheetComponent} from "./components/view-chordsheet/view-chordsheet.component";
import {DmcaComponent} from "./components/dmca/dmca.component";
import {DmcaPolicyComponent} from "./components/dmca/dmca-policy/dmca-policy.component";
import {ChordDisplayComponent} from "./components/chord-display/chord-display.component";
import {AdminGuardService} from "./services/guards/admin-guard/admin-guard.service";
import {DmcaRequestsComponent} from "./components/dmca/dmca-requests/dmca-requests.component";
import {DmcaDisputeComponent} from "./components/dmca/dmca-dispute/dmca-dispute.component";
import {DmcaRequestFormComponent} from "./components/dmca/dmca-request-form/dmca-request-form.component";

const routes: Routes = [
  { path: "login", component: LoginSignupComponent },
  { path: "privacy-policy", component: PrivacyComponent },
  { path: "create", component: EditScreenComponent, canActivate: [RouteGuardService], resolve: {data: ChordsheetService} },
  { path: "edit/:songtitle", component: EditScreenComponent, canActivate: [RouteGuardService], resolve: {data: ChordsheetService} },
  { path: "view/:songtitle/:username", component: ViewChordsheetComponent, resolve: {data: ChordsheetService} },
  { path: "view/:songtitle/:username/full", component: ChordDisplayComponent, resolve: {data: ChordsheetService} },
  { path: "dmca", component: DmcaComponent,
    children: [
      { path: "", redirectTo: 'policy' },
      { path: "policy", component: DmcaPolicyComponent },
      { path: "requests", component: DmcaRequestFormComponent },
      { path: "dispute/:id", component:DmcaDisputeComponent },
      { path: "admin", component: DmcaRequestsComponent, canActivate: [AdminGuardService] }
    ]},
  { path: "", pathMatch: 'full', component: MainScreenComponent },
  { path: "404", component: NotFoundComponent },
  { path: '**', redirectTo: '/404' }
];

@NgModule({
  imports: [ RouterModule.forRoot(routes) ],
  exports: [ RouterModule ]
})
export class AppRoutingModule { }
