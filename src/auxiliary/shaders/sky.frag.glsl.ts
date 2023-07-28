export const skyFragmentShader = `
#include <common>
#include <packing>
#include <lights_pars_begin>


in vec3 n;
uniform vec3 skyColor;
uniform vec3 nightSkyColor;
uniform vec3 lightDir;

out vec4 fragColor;

void main() {
    float incidenceAngle = clamp(dot(-lightDir, n),0.0,1.0);
    float incidenceCos = dot(-lightDir, n);
    float v = 1.0;

    #pragma unroll_loop_start 
    for(int i = 0; i < 200; i++)v = v* incidenceAngle* incidenceAngle;
    #pragma unroll_loop_end

    float changeRate = sqrt(1.0 + max(0.0,3.0*incidenceCos))/2.0;
    
    vec3 finalColor = mix(nightSkyColor, mix(skyColor,directionalLights[0].color, v), changeRate);


    fragColor = vec4(finalColor,1.0);
}
`