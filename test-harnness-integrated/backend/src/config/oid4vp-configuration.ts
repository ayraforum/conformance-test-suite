interface Field {
    path: string[];
    filter: {
        type: string;
        const?: string;
        contains?: {
            const: string;
        };
    };
}

interface InputDescriptor {
    id: string;
    name: string;
    purpose: string;
    constraints: {
        fields: Field[];
    };
}

interface PresentationDefinition {
    id: string;
    input_descriptors: InputDescriptor[];
}

interface JWKKey {
    kty: string;
    d: string;
    crv: string;
    alg: string;
    kid: string;
    x: string;
    y: string;
}

interface OID4VPConfiguration {
    alias: string;
    description: string;
    server: {
        authorization_endpoint: string;
    };
    client: {
        presentation_definition: PresentationDefinition;
        jwks: {
            keys: JWKKey[];
        };
        client_id: string;
    };
}

export const oid4vpConfig: OID4VPConfiguration = {
    alias: "dave-example",
    description: "dave-example",
    server: {
        authorization_endpoint: "openid4vp://authorize"
    },
    client: {
        presentation_definition: {
            id: "university_degree_presentation_definition",
            input_descriptors: [
                {
                    id: "university_degree",
                    name: "University Degree",
                    purpose: "Verify that the holder has a university degree",
                    constraints: {
                        fields: [
                            {
                                path: ["$.type"],
                                filter: {
                                    type: "array",
                                    contains: {
                                        const: "UniversityDegree"
                                    }
                                }
                            },
                            {
                                path: ["$.credentialSubject.degree.type"],
                                filter: {
                                    type: "string",
                                    const: "BachelorDegree"
                                }
                            },
                            {
                                path: ["$.credentialSubject.degree.name"],
                                filter: {
                                    type: "string"
                                }
                            },
                            {
                                path: ["$.@context"],
                                filter: {
                                    type: "array",
                                    contains: {
                                        const: "https://www.w3.org/2018/credentials/v1"
                                    }
                                }
                            }
                        ]
                    }
                }
            ]
        },
        jwks: {
            keys: [
                {
                    kty: "EC",
                    d: "k9UAUgc505Y7EhClayWVyaaV8K_U4nMv_P0xXCE4KP8",
                    crv: "P-256",
                    alg: "ES256",
                    kid: "khljdeulFBjJFBkannQf4LgMnDphp7309lcskUqtDRs",
                    x: "qDoclYhZi28PYgKwygUHukpLnOu3A6ZIzhVjekNiGhA",
                    y: "UhFlim9fLkrSu0s3GmT96FsBM_z1tayNbOmmM6sqjHU"
                }
            ]
        },
        client_id: "test"
    }
};
