"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cloud, CloudSun, Moon, Sun, Droplets } from "lucide-react";
import type { CurrentWeather } from "@/lib/api";

interface Props {
  weather: CurrentWeather | null;
}

function WeatherIcon({ cloud, ghi }: { cloud: number; ghi: number }) {
  const cls = "h-10 w-10";
  if (ghi < 50) return <Moon className={`${cls} text-indigo-400`} />;
  if (cloud > 70) return <Cloud className={`${cls} text-gray-400`} />;
  if (cloud > 30) return <CloudSun className={`${cls} text-amber-400`} />;
  return <Sun className={`${cls} text-amber-500`} />;
}

export function WeatherCard({ weather }: Props) {
  if (!weather) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Current Weather
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground animate-pulse">Loading weather data...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-950/30 dark:to-blue-950/30 border-sky-200/50 dark:border-sky-800/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-sky-700 dark:text-sky-300">
          Current Weather
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <WeatherIcon cloud={weather.cloud_cover} ghi={weather.ghi} />
          <div>
            <p className="text-3xl font-bold tabular-nums">{weather.temperature.toFixed(1)}°C</p>
            <p className="text-sm text-muted-foreground">
              GHI: {weather.ghi.toFixed(0)} W/m²
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-background/60 p-2.5">
            <Cloud className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-[11px] text-muted-foreground">Cloud</p>
              <p className="text-sm font-semibold tabular-nums">{weather.cloud_cover.toFixed(0)}%</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-background/60 p-2.5">
            <Droplets className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-[11px] text-muted-foreground">Humidity</p>
              <p className="text-sm font-semibold tabular-nums">{weather.relative_humidity.toFixed(0)}%</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
