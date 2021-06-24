import { StyleSheet } from 'react-native';
import { FRAME_HEIGHT, FRAME_WIDTH, POI_MENU_DIM, PLUS_ICON_DIM } from './constants';

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
        alignContent: 'center'
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
        borderRadius: 4,
        height: 200,
        width: FRAME_WIDTH,
        flexDirection: 'row',
        backgroundColor: 'white',
        borderRadius: 40
    }
});