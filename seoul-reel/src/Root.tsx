import React from "react";
import { Composition } from "remotion";
import { Reel } from "./Reel";
import { FPS, totalFrames } from "./timeline";
import type { ReelProps } from "./types";
import script from "../data/script.json";

const defaultProps = script as ReelProps;

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Reel"
    component={Reel}
    width={1080}
    height={1920}
    fps={FPS}
    durationInFrames={totalFrames(defaultProps)}
    defaultProps={defaultProps}
    calculateMetadata={({ props }) => ({ durationInFrames: totalFrames(props) })}
  />
);
