#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(SharedItems, NSObject)

RCT_EXTERN_METHOD(getSharedPayload:(NSString *)sharedKey
                  sharedType:(NSString *)sharedType
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(clearSharedPayload:(NSString *)sharedKey
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(readAndClearSharedPayload:(NSString *)sharedKey
                  sharedType:(NSString *)sharedType
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
