import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/** Root host: outlet only — shell chrome lives on authenticated AppShell. */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
