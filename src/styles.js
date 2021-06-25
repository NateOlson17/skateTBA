import { StyleSheet } from 'react-native';
import { FRAME_HEIGHT, FRAME_WIDTH, POI_MENU_DIM, PLUS_ICON_DIM, DM_ICON_DIM } from './constants';

export const styles = StyleSheet.create({

    container: {
        flex: 1,
        backgroundColor: "#fff"
    },

    displayBar: {
        resizeMode: 'contain', 
        width: 100, 
        flexBasis: 20
    },

    POIexit_generic: {
        resizeMode: 'contain', 
        height: FRAME_WIDTH * .07, 
        width: FRAME_WIDTH * .07
    },

    POIdisplayBG: {
        resizeMode: 'contain', 
        position: 'absolute',  
        height: 200, 
        width: FRAME_WIDTH
    },

    POIexit_TO: {
        position: 'absolute', 
        top: 20,
        right: 20, 
        width: FRAME_WIDTH * .07, 
        zIndex: 5
    },

    POIdisplayAdditionalMenu_ContentWrapper: {
        position: 'absolute', 
        width: FRAME_WIDTH, 
        height: 200, 
        bottom: FRAME_HEIGHT * .04 + PLUS_ICON_DIM + 210, 
        justifyContent: 'center', 
        alignContent: 'center',
        backgroundColor: 'white',
        borderRadius: 40
    },

    FlatListPerImg: {
        zIndex: 5, 
        height: 140, 
        width: 140, 
        resizeMode: 'contain', 
        alignSelf: 'center', 
        marginRight: 15, 
        marginTop: 30
    },

    fullScreenImgView: {
        zIndex: 8, 
        position: 'absolute', 
        width: FRAME_WIDTH, 
        height: FRAME_HEIGHT, 
        backgroundColor: 'rgba(255, 255, 255, 0.8)', 
        justifyContent: 'center', 
        alignContent: 'center'
    },

    gestureBar: {
        width: FRAME_WIDTH * .6, 
        height: 3,
        resizeMode: 'stretch', 
        position: 'absolute', 
        left: FRAME_WIDTH * .2, 
        top: 7, 
        opacity: .3
    },

    POIAdditionWrapper: {
        position: 'absolute',
        left: (FRAME_WIDTH - POI_MENU_DIM)/2,
        width: POI_MENU_DIM,
        height: 452,
        flexDirection: 'row', 
        flexWrap: 'wrap'
    },

    POIAdditionBG: {
        position: 'absolute',
        width: POI_MENU_DIM,
        height: 452,
        resizeMode: 'stretch',
        bottom: 10
    },

    currentPOIWrapper: {
        position: 'absolute',
        height: 200,
        width: FRAME_WIDTH,
        flexDirection: 'row',
        backgroundColor: 'white',
        borderRadius: 40
    },

    POIimagesWrapper: {
        position: 'absolute',
        width: FRAME_WIDTH,
        height: FRAME_HEIGHT,
        zIndex: 0
    },

    POIcommentsWrapper: {
        position: 'absolute',
        width: FRAME_WIDTH,
        height: FRAME_HEIGHT
    },

    bugReportImg: {
        height: FRAME_WIDTH * .1,
        width: FRAME_WIDTH * .1,
        resizeMode: 'contain',
        paddingRight: FRAME_HEIGHT <= 667 ? 5 : FRAME_WIDTH * .3
    },

    addPOIplus: {
        position: 'absolute',
        bottom: .04  * FRAME_HEIGHT,
        left: (FRAME_WIDTH - PLUS_ICON_DIM) / 2,
        height: PLUS_ICON_DIM,
        width: PLUS_ICON_DIM,
        resizeMode: 'contain'
    },

    DMswitch: {
        position: 'absolute',
        bottom: .04  * FRAME_HEIGHT,
        left: (FRAME_WIDTH - DM_ICON_DIM) / 2 + .25 * FRAME_WIDTH,
        height: DM_ICON_DIM,
        width: DM_ICON_DIM,
        resizeMode: 'contain'
    },

    filterMenuAnimWrap: {
        height: 300, 
        backgroundColor: 'white', 
        borderRadius: 40, 
        width: FRAME_WIDTH, 
        position: 'absolute', 
        flexDirection: 'row', 
        flexWrap: 'wrap' 
    },

    rangeSliderWrap: {
        width: FRAME_WIDTH / 2,
        alignItems: 'center',
        marginTop: 10
    },

    submitPOIbutton: {
        position: 'absolute', 
        top: 300, 
        right: 20, 
        width: POI_MENU_DIM * .2, 
        height: POI_MENU_DIM * .2
    },

    commentActionButtons: {
        position: 'absolute', 
        height: FRAME_WIDTH * .07, 
        width: FRAME_WIDTH * .07, 
        top: 60
    }
});