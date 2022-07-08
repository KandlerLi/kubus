import {
  Component,
  ElementRef,
  HostListener,
  OnInit,
  ViewChild,
} from '@angular/core';
import { Cube } from './cube';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  @ViewChild('canvas', { static: true })
  canvas!: ElementRef<HTMLCanvasElement>;
  private ctx: CanvasRenderingContext2D | undefined | null;
  private cubes: Cube[] | undefined;
  private zoom: number = 20;
  private lastZoom = this.zoom;
  private isDragging = false;
  private dragStart = { x: 0, y: 0 };
  private cameraOffset = { x: 0, y: 0 };
  private initialPinchDistance = null;

  private fieldOffset = {x: -642, y: 21}

  private MAX = 120
  private MIN = 100

  ngOnInit(): void {
    this.ctx = this.canvas.nativeElement.getContext('2d');

    this.cubes = [
      ... this.circle(this.MIN),
      ... this.circle(this.MAX),
      ... this.lines(this.MIN, this.MAX, 10)
    ] // 320
    this.center()

    this.draw();
    this.resizeCanvas()
  }

  private center() {
    this.zoom = this.maxZoom

    const x = this.canvas.nativeElement.width / 2 / this.zoom
    const y = this.canvas.nativeElement.height / 2 / this.zoom
    
    this.cameraOffset = {x, y}
  }

  private get maxZoom(): number {
    const allX = this.cubes?.map(cube => cube.x) ?? [-10]
    const allY = this.cubes?.map(cube => cube.y) ?? [-10]

    const xMin = Math.min(...allX)
    const xMax = Math.max(...allX)

    const yMin = Math.min(...allY)
    const yMax = Math.max(...allY)

    const xZoom = this.canvas.nativeElement.width / (xMax - xMin) 
    const yZoom =  this.canvas.nativeElement.height  / (yMax - yMin)

    return Math.min(xZoom, yZoom)
  }

  private lines(start: number, end: number, amount: number): Cube[] {
    return [...Array(Math.ceil(amount/4)).keys()]
        .map(i => i*360/amount)
        .map(angle => [...Array(end-start).keys()].map(x => x + start).map(x => {
          const y = Math.tan(angle) * x
          return { x, y, z: 0, color: 'orange' };
        })).flat()
  }

  // return {x: angle, y: angle, z: 0, color: 'orange'}

  private circle(r: number): Cube[] {
    return [...Array(r).keys()]
      .map(x => {
        const y = Math.round(Math.pow(Math.pow(r, 2) - Math.pow(x, 2), 0.5));
        return {x: x, y: y, z: 0, color: 'red'}
      })
      .concat({x: 0, y: 0, z: 0, color: 'green'})
      .map(({x, y, color}) => {
        if(r % 2 === 0) {
          return [
            {x: x, y: y, z: 0, color},
            {x: -x-1, y: y, z: 0, color},
            {x: x, y: -y-1, z: 0, color},
            {x: -x-1, y: -y-1, z: 0, color},
      
            {x: y, y: x, z: 0, color},
            {x: -y-1, y: x, z: 0, color},
            {x: y, y: -x-1, z: 0, color},
            {x: -y-1, y: -x-1, z: 0, color},
          ]
        } else {
          return [
            {x: x, y: y, z: 0, color},
            {x: -x, y: y, z: 0, color},
            {x: x, y: -y, z: 0, color},
            {x: -x, y: -y, z: 0, color},
      
            {x: y, y: x, z: 0, color},
            {x: -y, y: x, z: 0, color},
            {x: y, y: -x, z: 0, color},
            {x: -y, y: -x, z: 0, color},
          ]
        }
      }).flat();
  }

  private draw = () => {
    if (this.ctx) {
      // Clear
      this.ctx.clearRect(
        0,
        0,
        this.canvas.nativeElement.width,
        this.canvas.nativeElement.height
      )

      // Grid
      this.ctx!.strokeStyle = 'gray';

      for(let x = 0; x < this.canvas.nativeElement.width / this.zoom; x++) {
        const xi = (x + this.cameraOffset.x % 1)*this.zoom
        this.ctx!.beginPath()
        this.ctx!.moveTo(xi, 0);
        this.ctx!.lineTo(xi, this.canvas.nativeElement.height);
        this.ctx!.stroke();
      }

      for(let y = 0; y < this.canvas.nativeElement.height / this.zoom; y++) {
        const yi = (y + this.cameraOffset.y % 1)*this.zoom
        this.ctx!.beginPath()
        this.ctx!.moveTo(0, yi);
        this.ctx!.lineTo(this.canvas.nativeElement.width, yi);
        this.ctx!.stroke();
      }


      // Cubes
      this.cubes?.forEach((cube) => {
        const { x, y } = cube;
        this.ctx!.fillStyle = cube.color;
        this.ctx!.fillRect(
          (x + this.cameraOffset.x) * this.zoom,
          (y + this.cameraOffset.y) * this.zoom,
          this.zoom,
          this.zoom
          );
        this.ctx!.strokeStyle = 'white';
        this.ctx?.strokeRect(
          (x + this.cameraOffset.x) * this.zoom,
          (y + this.cameraOffset.y) * this.zoom,
          this.zoom,
          this.zoom
        )
      });
    }

    requestAnimationFrame(this.draw)
  }

  @HostListener('wheel', ['$event'])
  onMouseWheel(event: WheelEvent) {
    const delta = event.deltaY / 10;
    const newZoom = this.zoom + delta
    const maxZoom = this.maxZoom *0.8

    this.zoom = newZoom > maxZoom ? newZoom : maxZoom;
  }

  @HostListener('mousedown', ['$event'])
  onPointerDown(e: MouseEvent) {
    this.isDragging = true;
    this.dragStart.x =
      this.getEventLocation(e).x / this.zoom - this.cameraOffset.x;
    this.dragStart.y =
      this.getEventLocation(e).y / this.zoom - this.cameraOffset.y;

      const {x, y} = this.coordsByEvent(e)

    this.cubes = this.cubes?.map(cube => {
      if(cube.x === x && cube.y === y && cube.color != 'green') {
        const color = (cube.color === 'red') ? 'orange' : 'red'
        return {...cube, color}
      }
      return cube
    })
  }

  @HostListener('mouseup', ['$event'])
  onPointerUp() {
    this.isDragging = false;
    this.initialPinchDistance = null;
    this.lastZoom = this.zoom;
  }

  @HostListener('mousemove', ['$event'])
  onPointerMove(e: MouseEvent) {
    const {x, y} = this.coordsByEvent(e)

    console.log(x + this.fieldOffset.x, y + this.fieldOffset.y);
    if (this.isDragging) {
      this.cameraOffset.x =
        this.getEventLocation(e).x / this.zoom - this.dragStart.x;
      this.cameraOffset.y =
        this.getEventLocation(e).y / this.zoom - this.dragStart.y;
      
    }
  }

  private coordsByEvent(e: MouseEvent): {x: number, y: number} {
    const {clientX, clientY} = e;

    return {
      x: Math.floor(clientX / this.zoom - this.cameraOffset.x),
      y: Math.floor(clientY / this.zoom - this.cameraOffset.y)
    }
  }

  getEventLocation(e: any): { x: number; y: number } {
    if (e.touches && e.touches.length == 1) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.clientX && e.clientY) {
      return { x: e.clientX, y: e.clientY };
    }
    return { x: 0, y: 0 };
  }

  @HostListener('window:resize', ['$event'])
  private resizeCanvas() {
    this.canvas.nativeElement.width = document.documentElement.clientWidth
    this.canvas.nativeElement.height = document.documentElement.clientHeight
  }
}
