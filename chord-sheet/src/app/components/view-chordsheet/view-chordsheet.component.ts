import {Component, OnInit, ViewChild} from '@angular/core';
import {ChordsheetService} from "../../services/chordsheet/chordsheet.service";
import {ActivatedRoute, Router} from "@angular/router";
import Chordsheet = APIResponse.CsElements.Chordsheet;
import {UserService} from "../../services/user/user.service";
import {ModalComponent} from "../common/modal/modal.component";

@Component({
  selector: 'app-view-chordsheet',
  templateUrl: './view-chordsheet.component.html',
  styleUrls: ['./view-chordsheet.component.css']
})
export class ViewChordsheetComponent implements OnInit {

  @ViewChild(ModalComponent) modal: ModalComponent;

  chordsheet: Chordsheet;

  constructor(private sender: ChordsheetService,
              private route: ActivatedRoute,
              private router: Router,
              private user: UserService, private chordservice: ChordsheetService) { }

  /** Set up title if supplied */
  ngOnInit() {
    // TODO: Fix the copy-pasta
    this.route.data
      .subscribe(
        (res: {data: Chordsheet | string | undefined }) => {
          // Check for bad values
          if (res.data && res.data != "create") {
            this.chordsheet = <Chordsheet> res.data;
          } else if (res.data == "create") {
            // Its create, do nothing TODO: Make this better.
          }
          else {
            // TODO: This happens during invalid access. Find something better!
            console.log("Denied access.");
            this.router.navigate(['/']);
          }
        }, err=>{console.log(err);this.router.navigate(['/']);}); // TODO: Make this all better
  }

  /** Trigger the modal to warn about the delete.
   *
   * @param id  The ID of the element that was requested to be deleted.
   */
  deleteModal() {
    // TODO: Multiple modals happen oddly. Destroy modals after navigating away.

    // Set up modal
    this.modal.title = "Delete " + this.chordsheet.songtitle + " ?";
    this.modal.message = "Are you sure you want to delete " + this.chordsheet.songtitle + " ?";
    this.modal.show();
  }

  /** Responds to the modal's response.
   *
   * @param $event  The response returned from the modal.
   */
  modalResponse($event: boolean) {
    let displayError = errMsg => {
      console.error("Delete failed.");
      console.log(errMsg);

      this.chordservice.deleteChordSheet()

      // TODO: User display error
      //this.displayInvalid = true;
      //this.errorMsg.messages = [errMsg,];

      this.router.navigate(['/']);
    };
  }

}
