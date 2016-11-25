import { Component, OnInit } from '@angular/core';
import {ChordsheetService} from "./chordsheet.service";

@Component({
  selector: 'app-chordsheet-list',
  templateUrl: 'chordsheet-list.component.html',
  styleUrls: ['chordsheet-list.component.css']
})
export class ChordsheetListComponent implements OnInit {

  constructor(private chordsheetSerivce: ChordsheetService) { }

  ngOnInit() {
    this.chordsheetSerivce.retrieveChordSheet().subscribe(()=>{});
  }

}
