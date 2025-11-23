/**
 * WebGL-based video effects processor for real-time color correction.
 * Implements GPU-accelerated color grading using custom fragment shaders.
 * Provides controls for exposure, brightness, contrast, saturation, temperature, and tint.
 * @module utils/videoEffects
 */

import { VideoEffects } from '../types';
import logger from './logger';

/**
 * WebGL-based video effects processor class.
 * Renders video to canvas with real-time color correction using custom shaders.
 * Supports multiple color correction parameters applied in real-time.
 *
 * @class
 * @example
 * const processor = new VideoEffectsProcessor(videoElement, canvasElement);
 * processor.startRenderLoop(effects);
 * // Later...
 * processor.destroy();
 */
export class VideoEffectsProcessor {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private video: HTMLVideoElement;
  private textureLocation: WebGLUniformLocation | null = null;
  private animationFrame: number | null = null;

  // Uniform locations for effects
  private uniformLocations: {
    brightness?: WebGLUniformLocation | null;
    contrast?: WebGLUniformLocation | null;
    saturation?: WebGLUniformLocation | null;
    temperature?: WebGLUniformLocation | null;
    tint?: WebGLUniformLocation | null;
    exposure?: WebGLUniformLocation | null;
  } = {};

  /**
   * Creates a new VideoEffectsProcessor instance.
   * Initializes WebGL context and compiles shaders for color correction.
   *
   * @param {HTMLVideoElement} video - The source video element to process
   * @param {HTMLCanvasElement} canvas - The canvas element to render effects to
   *
   * @example
   * const videoEl = document.getElementById('video') as HTMLVideoElement;
   * const canvasEl = document.getElementById('canvas') as HTMLCanvasElement;
   * const processor = new VideoEffectsProcessor(videoEl, canvasEl);
   */
  constructor(video: HTMLVideoElement, canvas: HTMLCanvasElement) {
    this.video = video;
    this.canvas = canvas;
    this.initWebGL();
  }

  private initWebGL(): void {
    this.gl = this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl') as WebGLRenderingContext;

    if (!this.gl) {
      logger.error('WebGL not supported');
      return;
    }

    // Vertex shader
    const vertexShaderSource = `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      varying vec2 v_texCoord;

      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = a_texCoord;
      }
    `;

    // Fragment shader with color correction
    const fragmentShaderSource = `
      precision mediump float;
      uniform sampler2D u_texture;
      uniform float u_brightness;
      uniform float u_contrast;
      uniform float u_saturation;
      uniform float u_temperature;
      uniform float u_tint;
      uniform float u_exposure;
      varying vec2 v_texCoord;

      vec3 adjustBrightness(vec3 color, float value) {
        return color + value;
      }

      vec3 adjustContrast(vec3 color, float value) {
        return (color - 0.5) * (1.0 + value) + 0.5;
      }

      vec3 adjustSaturation(vec3 color, float value) {
        float gray = dot(color, vec3(0.299, 0.587, 0.114));
        return mix(vec3(gray), color, 1.0 + value);
      }

      vec3 adjustTemperature(vec3 color, float value) {
        // Warm = more red/yellow, Cool = more blue
        if (value > 0.0) {
          color.r += value * 0.3;
          color.g += value * 0.1;
        } else {
          color.b += abs(value) * 0.3;
        }
        return color;
      }

      vec3 adjustTint(vec3 color, float value) {
        // Green/Magenta tint
        if (value > 0.0) {
          color.g += value * 0.3;
        } else {
          color.r += abs(value) * 0.2;
          color.b += abs(value) * 0.2;
        }
        return color;
      }

      vec3 adjustExposure(vec3 color, float value) {
        return color * pow(2.0, value);
      }

      void main() {
        vec3 color = texture2D(u_texture, v_texCoord).rgb;

        // Apply effects in order
        color = adjustExposure(color, u_exposure);
        color = adjustBrightness(color, u_brightness);
        color = adjustContrast(color, u_contrast);
        color = adjustSaturation(color, u_saturation);
        color = adjustTemperature(color, u_temperature);
        color = adjustTint(color, u_tint);

        // Clamp to valid range
        color = clamp(color, 0.0, 1.0);

        gl_FragColor = vec4(color, 1.0);
      }
    `;

    const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);

    if (!vertexShader || !fragmentShader) {
      logger.error('Failed to create shaders');
      return;
    }

    this.program = this.createProgram(vertexShader, fragmentShader);

    if (!this.program) {
      logger.error('Failed to create WebGL program');
      return;
    }

    // Set up geometry (full-screen quad)
    const positionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,
         1,  1,
      ]),
      this.gl.STATIC_DRAW
    );

    const positionLocation = this.gl.getAttribLocation(this.program, 'a_position');
    this.gl.enableVertexAttribArray(positionLocation);
    this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);

    // Set up texture coordinates
    const texCoordBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, texCoordBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array([
        0, 1,
        1, 1,
        0, 0,
        1, 0,
      ]),
      this.gl.STATIC_DRAW
    );

    const texCoordLocation = this.gl.getAttribLocation(this.program, 'a_texCoord');
    this.gl.enableVertexAttribArray(texCoordLocation);
    this.gl.vertexAttribPointer(texCoordLocation, 2, this.gl.FLOAT, false, 0, 0);

    // Get uniform locations
    this.textureLocation = this.gl.getUniformLocation(this.program, 'u_texture');
    this.uniformLocations.brightness = this.gl.getUniformLocation(this.program, 'u_brightness');
    this.uniformLocations.contrast = this.gl.getUniformLocation(this.program, 'u_contrast');
    this.uniformLocations.saturation = this.gl.getUniformLocation(this.program, 'u_saturation');
    this.uniformLocations.temperature = this.gl.getUniformLocation(this.program, 'u_temperature');
    this.uniformLocations.tint = this.gl.getUniformLocation(this.program, 'u_tint');
    this.uniformLocations.exposure = this.gl.getUniformLocation(this.program, 'u_exposure');

    // Create texture
    const texture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);

    logger.debug('WebGL initialized for video effects');
  }

  /**
   * Creates and compiles a WebGL shader from source code.
   *
   * @private
   * @param {number} type - Shader type (gl.VERTEX_SHADER or gl.FRAGMENT_SHADER)
   * @param {string} source - GLSL shader source code
   * @returns {WebGLShader | null} Compiled shader, or null if compilation failed
   */
  private createShader(type: number, source: string): WebGLShader | null {
    if (!this.gl) return null;

    const shader = this.gl.createShader(type);
    if (!shader) return null;

    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      logger.error('Shader compilation error:', this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  /**
   * Creates and links a WebGL program from compiled shaders.
   *
   * @private
   * @param {WebGLShader} vertexShader - Compiled vertex shader
   * @param {WebGLShader} fragmentShader - Compiled fragment shader
   * @returns {WebGLProgram | null} Linked program, or null if linking failed
   */
  private createProgram(vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram | null {
    if (!this.gl) return null;

    const program = this.gl.createProgram();
    if (!program) return null;

    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);

    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      logger.error('Program linking error:', this.gl.getProgramInfoLog(program));
      this.gl.deleteProgram(program);
      return null;
    }

    this.gl.useProgram(program);
    return program;
  }

  /**
   * Applies color correction effects to the current video frame.
   * Renders a single frame with the specified effects to the canvas.
   *
   * @public
   * @param {VideoEffects} effects - Color correction parameters to apply
   *
   * @example
   * const effects = { brightness: 0.2, contrast: 0.1, saturation: 0, temperature: 0, tint: 0, exposure: 0.1 };
   * processor.applyEffects(effects);
   */
  public applyEffects(effects: VideoEffects): void {
    if (!this.gl || !this.program) return;

    // Set canvas size to match video
    this.canvas.width = this.video.videoWidth;
    this.canvas.height = this.video.videoHeight;

    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);

    // Update texture with current video frame
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGBA,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      this.video
    );

    // Set uniform values
    this.gl.uniform1f(this.uniformLocations.brightness!, effects.brightness);
    this.gl.uniform1f(this.uniformLocations.contrast!, effects.contrast);
    this.gl.uniform1f(this.uniformLocations.saturation!, effects.saturation);
    this.gl.uniform1f(this.uniformLocations.temperature!, effects.temperature);
    this.gl.uniform1f(this.uniformLocations.tint!, effects.tint);
    this.gl.uniform1f(this.uniformLocations.exposure!, effects.exposure);

    // Draw
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  }

  /**
   * Starts a continuous render loop to apply effects in real-time.
   * Automatically syncs with video playback using requestAnimationFrame.
   * The render loop continues until stopRenderLoop() is called or video ends.
   *
   * @public
   * @param {VideoEffects} effects - Color correction parameters to apply continuously
   *
   * @example
   * const effects = { brightness: 0, contrast: 0, saturation: 0, temperature: 0, tint: 0, exposure: 0 };
   * processor.startRenderLoop(effects);
   */
  public startRenderLoop(effects: VideoEffects): void {
    const render = () => {
      if (!this.video.paused && !this.video.ended) {
        this.applyEffects(effects);
      }
      this.animationFrame = requestAnimationFrame(render);
    };

    render();
  }

  /**
   * Stops the continuous render loop.
   * Call this to pause effects processing or before destroying the processor.
   *
   * @public
   *
   * @example
   * processor.stopRenderLoop();
   */
  public stopRenderLoop(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  /**
   * Cleans up WebGL resources and stops rendering.
   * Call this when the processor is no longer needed to free memory.
   *
   * @public
   *
   * @example
   * processor.destroy();
   */
  public destroy(): void {
    this.stopRenderLoop();
    if (this.gl && this.program) {
      this.gl.deleteProgram(this.program);
    }
  }
}

/**
 * Default video effects with all parameters set to neutral (0).
 * Use as a starting point or reset value for color correction.
 *
 * @constant
 * @type {VideoEffects}
 *
 * @example
 * const [effects, setEffects] = useState(defaultEffects);
 */
export const defaultEffects: VideoEffects = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  temperature: 0,
  tint: 0,
  exposure: 0,
};
