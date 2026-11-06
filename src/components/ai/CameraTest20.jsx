import React from 'react';
import {Navigate} from 'react-router-dom';

// Keep the familiar camera preview and Start flow. The drill switch remains
// available on the camera page, without a separate launcher screen.
export default function CameraTest20(){
 return <Navigate to="/tracker-tests/right-hand-pound-test20" replace/>;
}
