
export const terrainVertexShader = `
#include <common>

uniform vec3 grassColor;
uniform vec3 rockColor;
uniform vec3 snowColor;
uniform float limitSlope;
uniform float heightTransition;
uniform float nearPlane;
uniform float farPlane;

out vec3 color;
out vec3 n;
out float dist;


float custom_rand(vec2 co){
  return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

float map(float value, float min1, float max1, float min2, float max2) {
  return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
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
    dist = map(distance(cameraPosition, modelPosition.xyz), nearPlane, farPlane, 0.0, 1.0);
    gl_Position = clipPosition;
}
`