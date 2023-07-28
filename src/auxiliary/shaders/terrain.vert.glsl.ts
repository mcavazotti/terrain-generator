
export const terrainVertexShader = `
#include <common>

uniform vec3 grassColor;
uniform vec3 rockColor;
uniform vec3 snowColor;
uniform float limitSlope;
uniform float heightTransition;
out vec3 color;
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
    vec3 up = vec3(0.0,1.0,0.0);
    vec3 baseColor;
    if(position.y + custom_rand(position.xz)* 10.0 < heightTransition)
        baseColor = grassColor;
    else
        baseColor = snowColor;

    if(acos(dot(up, normalize(normal))) + custom_rand(position.xy)* 0.1 >= radians(limitSlope))
        baseColor = rockColor;

    color = baseColor +  (vec3(custom_rand(position.xy),custom_rand(position.xz), custom_rand(position.yz)) * 0.01);
    n = normal;
    gl_Position = clipPosition;
}
`