import { CfnMapping } from 'aws-cdk-lib';
import { CfnDomain, Domain, EngineVersion } from 'aws-cdk-lib/aws-opensearchservice';
import {
    CfnUserPool,
    CfnUserPoolDomain,
    CfnUserPoolClient,
    CfnIdentityPool,
    CfnIdentityPoolRoleAttachment,
} from 'aws-cdk-lib/aws-cognito';
import { EbsDeviceVolumeType } from 'aws-cdk-lib/aws-ec2';
import {
    Role,
    ManagedPolicy,
    ServicePrincipal,
    PolicyStatement,
    Effect,
    CfnRole,
    FederatedPrincipal,
    PolicyDocument,
    ArnPrincipal,
    Condition,
} from 'aws-cdk-lib/aws-iam';
import { LogGroup, ResourcePolicy } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { Key } from 'aws-cdk-lib/aws-kms';

export default class ElasticSearchResources {
    kibanaUserPool: CfnUserPool;

    kibanaUserPoolDomain: CfnUserPoolDomain;

    kibanaUserPoolClient: CfnUserPoolClient;

    kibanaIdentityPool: CfnIdentityPool;

    kibanaCognitoRole: Role;

    adminKibanaAccessRole: Role;

    identityPoolRoleAttachment: CfnIdentityPoolRoleAttachment;

    searchLogs: LogGroup;

    searchLogsResourcePolicy: ResourcePolicy;

    elasticSearchDomain: Domain;

    constructor(
        scope: Construct,
        isDevCondition: Condition,
        stackName: string,
        stage: string,
        account: string,
        partition: string,
        region: string,
        isDev: boolean,
        elasticSearchKMSKey: Key,
    ) {
        const regionMappings: CfnMapping = new CfnMapping(scope, 'regionMap', {
            mapping: {
                'us-east-2': {
                    smallEc2: 'c6g.large.search',
                    largeEc2: 'm6g.large.search',
                },
                'us-east-1': {
                    smallEc2: 'c6g.large.search',
                    largeEc2: 'm6g.large.search',
                },
                'us-west-1': {
                    smallEc2: 'c6g.large.search',
                    largeEc2: 'r6g.large.search',
                },
                'us-west-2': {
                    smallEc2: 'c6g.large.search',
                    largeEc2: 'm6g.large.search',
                },
                'af-south-1': {
                    smallEc2: 'c5.large.search',
                    largeEc2: 'm5.large.search',
                },
                'ap-east-1': {
                    smallEc2: 'c6g.large.search',
                    largeEc2: 'm6g.large.search',
                },
                'ap-south-1': {
                    smallEc2: 'c6g.large.search',
                    largeEc2: 'r6g.large.search',
                },
                'ap-southeast-2': {
                    smallEc2: 'c6g.large.search',
                    largeEc2: 'm6g.large.search',
                },
                'ap-southeast-1': {
                    smallEc2: 'c6g.large.search',
                    largeEc2: 'm6g.large.search',
                },
                'ap-northeast-3': {
                    smallEc2: 'c5.large.search',
                    largeEc2: 'm5.large.search',
                },
                'ap-northeast-2': {
                    smallEc2: 'c6g.large.search',
                    largeEc2: 'm6g.large.search',
                },
                'ap-northeast-1': {
                    smallEc2: 'c6g.large.search',
                    largeEc2: 'm6g.large.search',
                },
                'ca-central-1': {
                    smallEc2: 'c6g.large.search',
                    largeEc2: 'm6g.large.search',
                },
                'eu-central-1': {
                    smallEc2: 'c6g.large.search',
                    largeEc2: 'm6g.large.search',
                },
                'eu-west-1': {
                    smallEc2: 'c6g.large.search',
                    largeEc2: 'm6g.large.search',
                },
                'eu-west-2': {
                    smallEc2: 'c6g.large.search',
                    largeEc2: 'm6g.large.search',
                },
                'eu-west-3': {
                    smallEc2: 'c5.large.search',
                    largeEc2: 'm5.large.search',
                },
                'eu-south-1': {
                    smallEc2: 'c5.large.search',
                    largeEc2: 'm5.large.search',
                },
                'eu-north-1': {
                    smallEc2: 'c6g.large.search',
                    largeEc2: 'm6g.large.search',
                },
                'me-south-1': {
                    smallEc2: 'c5.large.search',
                    largeEc2: 'm5.large.search',
                },
                'sa-east-1': {
                    smallEc2: 'c6g.large.search',
                    largeEc2: 'm6g.large.search',
                },
                'us-gov-east-1': {
                    smallEc2: 'c6g.large.search',
                    largeEc2: 'm6g.large.search',
                },
                'us-gov-west-1': {
                    smallEc2: 'c6g.large.search',
                    largeEc2: 'm6g.large.search',
                },
            },
        });

        if (isDev) {
            this.kibanaUserPool = new CfnUserPool(scope, 'kibanaUserPool', {
                userPoolName: `${stackName}-Kibana`,
                adminCreateUserConfig: {
                    allowAdminCreateUserOnly: true,
                },
                autoVerifiedAttributes: ['email'],
                schema: [
                    {
                        attributeDataType: 'String',
                        name: 'email',
                        required: true,
                    },
                    {
                        attributeDataType: 'String',
                        name: 'cc_confirmed',
                    },
                ],
            });
            this.kibanaUserPool.cfnOptions.condition = isDevCondition;

            this.kibanaUserPoolDomain = new CfnUserPoolDomain(scope, 'kibanaUserPoolDomain', {
                userPoolId: this.kibanaUserPool.ref,
                domain: `kibana-${stage}-${account}`,
            });

            this.kibanaUserPoolClient = new CfnUserPoolClient(scope, 'kibanaUserPoolClient', {
                clientName: `${stackName}-KibanaClient`,
                generateSecret: false,
                userPoolId: this.kibanaUserPool.ref,
                explicitAuthFlows: ['ADMIN_NO_SRP_AUTH', 'USER_PASSWORD_AUTH'],
                preventUserExistenceErrors: 'ENABLED',
            });

            this.kibanaIdentityPool = new CfnIdentityPool(scope, 'kibanaIdentityPool', {
                identityPoolName: `${stackName}-KibanaIDPool`,
                allowUnauthenticatedIdentities: false,
                cognitoIdentityProviders: [
                    {
                        clientId: this.kibanaUserPoolClient.ref,
                        providerName: this.kibanaUserPool.attrProviderName,
                    },
                ],
            });

            this.kibanaCognitoRole = new Role(scope, 'kibanaCognitoRole', {
                managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName('AmazonESCognitoAccess')],
                assumedBy: new ServicePrincipal('es.amazonaws.com'),
            });

            this.adminKibanaAccessRole = new Role(scope, 'adminKibanaAccessRole', {
                assumedBy: new FederatedPrincipal(
                    'cognito-identity.amazonaws.com',
                    {
                        StringEquals: {
                            'cognito-identity.amazonaws.com:aud': this.kibanaIdentityPool.ref,
                        },
                        'ForAnyValue:StringLike': {
                            'cognito-identity.amazonaws.com:amr': 'authenticated',
                        },
                    },
                    'sts:AssumeRoleWithWebIdentity',
                ),
            });

            this.identityPoolRoleAttachment = new CfnIdentityPoolRoleAttachment(scope, 'identityPoolRoleAttachment', {
                identityPoolId: this.kibanaIdentityPool.ref,
                roles: {
                    authenticated: this.adminKibanaAccessRole.roleArn,
                },
            });
        }

        this.searchLogs = new LogGroup(scope, 'searchLogs', {
            logGroupName: `${stackName}-search-logs`,
        });

        this.searchLogsResourcePolicy = new ResourcePolicy(scope, 'searchLogsResourcePolicy', {
            policyStatements: [
                new PolicyStatement({
                    effect: Effect.ALLOW,
                    principals: [new ServicePrincipal('es.amazonaws.com')],
                    actions: ['logs:PutLogEvents', 'logs:CreateLogStream'],
                    resources: [`arn:${partition}:logs:${region}:${account}:log-group:${stackName}-search-logs:*`],
                }),
            ],
            resourcePolicyName: `${stackName}-search-logs-resource-policy`,
        });
        this.searchLogsResourcePolicy.node.addDependency(this.searchLogs);

        const elasticSearchDomainAccessPolicy = [
            new PolicyStatement({
                effect: Effect.ALLOW,
                principals: [
                    new ArnPrincipal(this.adminKibanaAccessRole.roleArn),
                    new ArnPrincipal(
                        `arn:${partition}:sts::${account}:assumed-role/${this.kibanaCognitoRole.roleName}/CognitoIdentityCredentials`,
                    ),
                ],
                actions: ['es:*'],
                resources: [`arn:${partition}:es:${region}:${account}:domain/*`],
            }),
        ];

        this.elasticSearchDomain = new Domain(scope, 'elasticSearchDomain', {
            // Assuming ~100GB storage requirement for PROD; min storage requirement is ~290GB https://docs.aws.amazon.com/elasticsearch-service/latest/developerguide/sizing-domains.html
            // If you change the size of the Elasticsearch Domain, consider also updating the NUMBER_OF_SHARDS on the updateSearchMappings resource
            ebs: {
                enabled: true,
                volumeType: EbsDeviceVolumeType.GP2,
                volumeSize: isDev ? 10 : 73,
            },
            version: EngineVersion.ELASTICSEARCH_7_10,
            zoneAwareness: {
                enabled: !isDev,
            },
            capacity: {
                masterNodes: isDev ? undefined : 3,
                masterNodeInstanceType: isDev ? undefined : regionMappings.findInMap(region, 'smallEc2'),
                dataNodes: isDev ? 1 : 4,
                dataNodeInstanceType: regionMappings.findInMap(region, isDev ? 'smallEc2' : 'largeEc2'),
            },
            encryptionAtRest: {
                enabled: true,
                kmsKey: elasticSearchKMSKey,
            },
            nodeToNodeEncryption: true,
            automatedSnapshotStartHour: isDev ? undefined : 0,
            cognitoDashboardsAuth: isDev
                ? {
                      identityPoolId: this.kibanaIdentityPool.ref,
                      userPoolId: this.kibanaUserPool.ref,
                      role: this.kibanaCognitoRole,
                  }
                : undefined,
            accessPolicies: isDev ? elasticSearchDomainAccessPolicy : undefined,
            logging: {
                appLogEnabled: true,
                appLogGroup: this.searchLogs,
                slowSearchLogEnabled: true,
                slowSearchLogGroup: this.searchLogs,
                slowIndexLogEnabled: true,
                slowIndexLogGroup: this.searchLogs,
            },
        });
        this.elasticSearchDomain.node.addDependency(this.searchLogsResourcePolicy);
    }
}
