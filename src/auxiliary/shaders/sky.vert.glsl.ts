
export const skyVertexShader = `
#include <common>

out vec3 n;


float custom_rand(vec2 co){
  return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

void main() {
    #include <beginnormal_vertex>
    #include <defaultnormal_vertex>
    
    #include <begin_vertex>

    #include <worldpos_vertex>

    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 clipPosition = projectionMatrix * viewPosition;

    n = normal;
    gl_Position = clipPosition;
}
`