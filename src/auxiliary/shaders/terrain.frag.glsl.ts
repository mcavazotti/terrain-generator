export const terrainFragmentShader = `
#include <common>
#include <packing>
#include <lights_pars_begin>

in vec3 color;
in vec3 n;
in float dist;
out vec4 fragColor;
uniform vec3 lightDir;

void main() {
    float incidenceAngle = dot(-lightDir, n);
    // float intensity = 1.0;
    float intensity = clamp(incidenceAngle,0.0,1.0);
    
    if(incidenceAngle < 0.3) intensity = 0.3;
    if(incidenceAngle > 0.3) intensity = 0.5;
    if(incidenceAngle > 0.5) intensity = 0.8;
    if(incidenceAngle > 0.8) intensity = 1.0;
    if(incidenceAngle < 0.0) intensity = 0.0;

    vec3 light = directionalLights[0].color * intensity + ambientLightColor;

    vec3 newColor = color * 8.0;
    vec3 finalColor = mix(vec3(floor(newColor.x),floor(newColor.y),floor(newColor.z))/ 8.0 * light, ambientLightColor, dist);
        
    // fragColor = vec4(directionalLights[0].direction,1.0);
    fragColor = vec4(finalColor,1.0);
    // fragColor = vec4((n/2.0) + vec3(0.5,0.5,0.5),1.0);
}
`